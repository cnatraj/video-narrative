/**
 * Service for extracting frames and audio from videos
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import fsExtra from "fs-extra";
import config from "../config/index.js";

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Set ffprobe path - using the dedicated ffprobe-static package
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Path to the processing directories
const processingDir = path.join(__dirname, "..", "processing");
const framesDir = path.join(processingDir, "frames");
const audioDir = path.join(processingDir, "audio");

/**
 * Frame Extraction Service for extracting frames and audio from videos
 */
const frameExtractionService = {
  // Make directories accessible to other modules
  framesDir,
  audioDir,

  /**
   * Extract frames from a video at regular intervals
   * @param {string} videoPath - Path to the video file
   * @param {Object} options - Options for frame extraction
   * @returns {Promise<Object>} - Result of frame extraction
   */
  async extractFrames(videoPath, options = {}) {
    try {
      // Create a unique session ID for this processing job
      const sessionId = options.sessionId || uuidv4();
      const sessionFramesDir = path.join(framesDir, sessionId);

      // Create session directory
      fsExtra.ensureDirSync(sessionFramesDir);

      // Default options
      const frameRate = options.frameRate || config.videoProcessing.frameRate; // Use config value
      const maxDuration =
        options.maxDuration || config.videoProcessing.maxDuration; // Use config value

      // Get video duration
      const videoDuration = await this.getVideoDuration(videoPath);
      console.log(`Video duration: ${videoDuration} seconds`);

      // Calculate effective duration to process (limit to maxDuration)
      const effectiveDuration = Math.min(videoDuration, maxDuration);
      console.log(
        `Processing first ${effectiveDuration} seconds of video at ${frameRate} frame(s) per second`
      );

      // Calculate the interval between frames in seconds
      const frameInterval = 1 / frameRate;

      // Extract frames
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .on("start", (commandLine) => {
            console.log("FFmpeg process started: " + commandLine);
          })
          .on("progress", (progress) => {
            if (progress.percent) {
              console.log(`Processing: ${Math.floor(progress.percent)}% done`);
            }
          })
          .on("error", (err) => {
            console.error("Error extracting frames:", err);
            reject(err);
          })
          .on("end", () => {
            console.log("Frame extraction complete");
            resolve({
              sessionId,
              framesDir: sessionFramesDir,
              frameCount: Math.ceil(effectiveDuration * frameRate),
              frameInterval: frameInterval, // Interval in seconds between frames
              videoDuration,
              processedDuration: effectiveDuration,
              truncated: videoDuration > maxDuration,
            });
          })
          .outputOptions([
            `-vf fps=1/${frameInterval}`, // Extract 1 frame every X seconds
            `-t ${effectiveDuration}`, // Only process up to the max duration
          ])
          .output(path.join(sessionFramesDir, "frame-%04d.jpg"))
          .run();
      });
    } catch (error) {
      console.error("Error in extractFrames:", error);
      throw new Error(`Failed to extract frames: ${error.message}`);
    }
  },

  /**
   * Extract audio from a video file
   * @param {string} videoPath - Path to the video file
   * @param {string} sessionId - Session ID for the processing job
   * @returns {Promise<Object>} - Result of audio extraction
   */
  async extractAudio(videoPath, sessionId) {
    try {
      // Ensure audio directory exists
      fsExtra.ensureDirSync(audioDir);

      const audioPath = path.join(audioDir, `${sessionId}.mp3`);

      console.log(`Extracting audio from video: ${videoPath}`);

      // Get the max duration from options or config
      const maxDuration = config.videoProcessing.maxDuration;

      // Get video duration
      const videoDuration = await this.getVideoDuration(videoPath);

      // Calculate effective duration to process (limit to maxDuration)
      const effectiveDuration = Math.min(videoDuration, maxDuration);

      console.log(
        `Extracting audio from video: ${videoPath} (first ${effectiveDuration} seconds)`
      );

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .on("start", (commandLine) => {
            console.log("FFmpeg audio extraction started: " + commandLine);
          })
          .on("progress", (progress) => {
            if (progress.percent) {
              console.log(
                `Audio extraction: ${Math.floor(progress.percent)}% done`
              );
            }
          })
          .on("error", (err) => {
            console.error("Error extracting audio:", err);
            reject(err);
          })
          .on("end", () => {
            console.log("Audio extraction complete");
            resolve({
              audioPath,
              sessionId,
              processedDuration: effectiveDuration,
              truncated: videoDuration > maxDuration,
            });
          })
          .noVideo()
          .audioCodec("libmp3lame")
          .audioBitrate(config.videoProcessing.audioBitrate) // Use the configured bitrate
          .outputOptions([
            `-t ${effectiveDuration}`, // Only extract audio up to the max duration
          ])
          .output(audioPath)
          .run();
      });
    } catch (error) {
      console.error("Error in extractAudio:", error);
      throw new Error(`Failed to extract audio: ${error.message}`);
    }
  },

  /**
   * Get the duration of a video in seconds
   * @param {string} videoPath - Path to the video file
   * @returns {Promise<number>} - Duration in seconds
   */
  getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error("Error getting video duration:", err);
          reject(err);
          return;
        }

        const durationSeconds = metadata.format.duration;
        resolve(durationSeconds);
      });
    });
  },

  /**
   * Filter frames to only include those with significant changes
   * @param {string} framesDir - Directory containing frames
   * @param {Object} options - Options for filtering
   * @returns {Promise<Array<string>>} - Array of frame filenames with significant changes
   */
  async filterSignificantFrames(framesDir, options = {}) {
    try {
      const frameFiles = fs
        .readdirSync(framesDir)
        .filter((file) => file.endsWith(".jpg"))
        .sort(); // Ensure frames are in order

      if (frameFiles.length === 0) return [];

      const significantFrames = [frameFiles[0]]; // Always include the first frame
      let lastSignificantFrame = frameFiles[0];

      console.log(
        `Filtering ${frameFiles.length} frames for significant changes...`
      );

      // If we have very few frames (less than 5), just use all of them
      if (frameFiles.length <= 5) {
        console.log(`Only ${frameFiles.length} frames total, using all frames`);
        return frameFiles;
      }

      // For more than 5 frames, do comparison to filter
      for (let i = 1; i < frameFiles.length; i++) {
        const currentFrame = frameFiles[i];
        const currentFramePath = path.join(framesDir, currentFrame);
        const lastFramePath = path.join(framesDir, lastSignificantFrame);

        // Import compareFrames dynamically to avoid circular dependencies
        const { compareFrames } = await import("../utils/videoUtils.js");

        // Compare current frame with last significant frame
        const isDifferent = await compareFrames(
          lastFramePath,
          currentFramePath,
          options.frameDiffThreshold ||
            config.videoProcessing.frameDiffThreshold
        );

        if (isDifferent) {
          significantFrames.push(currentFrame);
          lastSignificantFrame = currentFrame;
          console.log(
            `Frame ${i} (${currentFrame}) is significantly different`
          );
        } else {
          console.log(
            `Frame ${i} (${currentFrame}) is similar to previous frame - SKIPPING`
          );
        }

        // Always include the last frame
        if (
          i === frameFiles.length - 1 &&
          lastSignificantFrame !== currentFrame
        ) {
          significantFrames.push(currentFrame);
          console.log(
            `Adding last frame ${currentFrame} to ensure complete coverage`
          );
        }
      }

      console.log(
        `Reduced ${frameFiles.length} frames to ${significantFrames.length} significant frames`
      );
      return significantFrames;
    } catch (error) {
      console.error("Error filtering significant frames:", error);
      // If filtering fails, return a subset of frames to avoid processing too many
      const allFrames = fs
        .readdirSync(framesDir)
        .filter((file) => file.endsWith(".jpg"))
        .sort();

      // Take first, last, and evenly spaced frames in between (max 10)
      const maxFramesToReturn = 10;
      const result = [allFrames[0]]; // First frame

      if (allFrames.length > 2) {
        // Add middle frames
        const step = Math.max(
          1,
          Math.floor(allFrames.length / maxFramesToReturn)
        );
        for (let i = step; i < allFrames.length - 1; i += step) {
          result.push(allFrames[i]);
        }
        // Add last frame
        result.push(allFrames[allFrames.length - 1]);
      }

      console.log(
        `Error in filtering, returning ${result.length} evenly spaced frames`
      );
      return result;
    }
  },
};

export default frameExtractionService;
