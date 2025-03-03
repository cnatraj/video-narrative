/**
 * Controller for video processing endpoints
 */
import youtubeService from "../services/youtubeService.js";
import videoProcessingService from "../services/videoProcessingService.js";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import config from "../config/index.js";

export const processYouTubeUrl = async (req, res) => {
  try {
    const { youtubeUrl } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    // Validate the YouTube URL
    if (!youtubeService.isValidYoutubeUrl(youtubeUrl)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    try {
      // Get video info first
      const videoInfo = await youtubeService.getVideoInfo(youtubeUrl);

      // Download the video
      const downloadResult = await youtubeService.downloadVideo(youtubeUrl);

      // Process the video to generate a narrative
      const processingResult = await videoProcessingService.processVideo(
        downloadResult.filePath,
        {
          frameRate: config.videoProcessing.frameRate,
          maxFrames: config.videoProcessing.maxFrames,
          frameDiffThreshold: config.videoProcessing.frameDiffThreshold,
        }
      );

      res.status(200).json({
        message: "YouTube URL processed successfully",
        url: youtubeUrl,
        videoInfo: videoInfo,
        downloadInfo: {
          filePath: downloadResult.filePath,
          cached: downloadResult.cached,
        },
        processingResult: {
          summary: processingResult.summary,
          timeline: processingResult.timeline,
          timestamps: processingResult.timestamps,
        },
      });
    } catch (downloadError) {
      console.error(
        "Error downloading or processing YouTube video:",
        downloadError
      );
      return res.status(400).json({
        error: `Failed to process video: ${downloadError.message}`,
        url: youtubeUrl,
      });
    }
  } catch (error) {
    console.error("Error processing YouTube URL:", error);
    res.status(500).json({ error: "Failed to process YouTube URL" });
  }
};

export const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const videoPath = req.file.path;

    // Validate that the file is a video
    const isVideo = await validateVideoFile(videoPath);
    if (!isVideo) {
      // Clean up the invalid file
      fs.unlinkSync(videoPath);
      return res
        .status(400)
        .json({ error: "Uploaded file is not a valid video" });
    }

    try {
      // Process the uploaded video
      const processingResult = await videoProcessingService.processVideo(
        videoPath,
        {
          frameRate: config.videoProcessing.frameRate,
          maxFrames: config.videoProcessing.maxFrames,
          frameDiffThreshold: config.videoProcessing.frameDiffThreshold,
        }
      );

      res.status(200).json({
        message: "Video processed successfully",
        file: req.file,
        processingResult: {
          summary: processingResult.summary,
          timeline: processingResult.timeline,
          narrative: processingResult.narrative,
          timestamps: processingResult.timestamps,
        },
      });
    } catch (processingError) {
      console.error("Error processing uploaded video:", processingError);
      return res.status(400).json({
        error: `Failed to process video: ${processingError.message}`,
        file: req.file.filename,
      });
    }
  } catch (error) {
    console.error("Error uploading video:", error);
    res.status(500).json({ error: "Failed to upload video" });
  }
};

export const getProcessingStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Check if the processing result exists
    const resultPath = path.join(
      videoProcessingService.outputDir,
      `${sessionId}-result.json`
    );

    if (fs.existsSync(resultPath)) {
      const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
      res.status(200).json({
        status: "completed",
        result,
      });
    } else {
      // Check if the session directory exists
      const sessionDir = path.join(videoProcessingService.framesDir, sessionId);

      if (fs.existsSync(sessionDir)) {
        res.status(200).json({
          status: "processing",
          message: "Video is still being processed",
        });
      } else {
        res.status(404).json({
          status: "not_found",
          message: "Processing session not found",
        });
      }
    }
  } catch (error) {
    console.error("Error getting processing status:", error);
    res.status(500).json({ error: "Failed to get processing status" });
  }
};

/**
 * Validate that a file is a valid video
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} - Whether the file is a valid video
 */
const validateVideoFile = async (filePath) => {
  try {
    // Use ffprobe to check if the file is a valid video
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error("Error validating video file:", err);
          resolve(false);
          return;
        }

        // Check if the file has video streams
        const hasVideoStream = metadata.streams.some(
          (stream) => stream.codec_type === "video"
        );
        resolve(hasVideoStream);
      });
    });
  } catch (error) {
    console.error("Error validating video file:", error);
    return false;
  }
};
