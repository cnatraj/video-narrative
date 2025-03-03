/**
 * Service for processing videos and generating narratives
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import fsExtra from "fs-extra";
import config from "../config/index.js";
import aiService from "./aiService.js";
import frameExtractionService from "./frameExtractionService.js";
import {
  formatTimestamp,
  findTranscriptForTimestamp,
  cleanupOldProcessingFiles,
} from "../utils/videoUtils.js";
import {
  getCachedImageDescription,
  cacheImageDescription,
} from "../utils/cacheUtils.js";

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the processing directories
const processingDir = path.join(__dirname, "..", "processing");
const framesDir = frameExtractionService.framesDir;
const outputDir = path.join(processingDir, "output");
const audioDir = frameExtractionService.audioDir;
const cacheDir = path.join(processingDir, "cache");

// Ensure cache directory exists
if (!fs.existsSync(cacheDir)) {
  fsExtra.ensureDirSync(cacheDir);
}

// Simple in-memory cache for image descriptions
// Make it global so it can be accessed by the clear-cache script
if (!global.imageDescriptionCache) {
  global.imageDescriptionCache = new Map();
}
const imageDescriptionCache = global.imageDescriptionCache;

/**
 * Video Processing Service for analyzing videos and generating narratives
 */
const videoProcessingService = {
  // Make directories accessible to other modules
  processingDir,
  framesDir,
  outputDir,
  audioDir,
  cacheDir,

  /**
   * Process frames sequentially
   * @param {Array<string>} frameFiles - Array of frame filenames
   * @param {string} framesDir - Directory containing frames
   * @param {number} frameInterval - Interval between frames in seconds
   * @param {Object} options - Processing options
   * @returns {Promise<Array<Object>>} - Array of frame data objects
   */
  async processFrames(frameFiles, framesDir, frameInterval, options = {}) {
    const frameData = [];

    console.log(`Processing ${frameFiles.length} frames sequentially...`);

    for (let i = 0; i < frameFiles.length; i++) {
      const frameFile = frameFiles[i];
      const framePath = path.join(framesDir, frameFile);

      // Extract frame number from filename (e.g., "frame-0001.jpg" -> 1)
      const frameNumberMatch = frameFile.match(/frame-(\d+)\.jpg/);
      const frameNumber = frameNumberMatch
        ? parseInt(frameNumberMatch[1])
        : i + 1;

      // Calculate time based on frame number and interval
      const frameTimeSeconds = (frameNumber - 1) * frameInterval;

      console.log(
        `Analyzing frame ${i + 1}/${frameFiles.length}: ${frameFile}`
      );

      // Check if we have a cached description
      let description = getCachedImageDescription(
        framePath,
        cacheDir,
        imageDescriptionCache,
        config.videoProcessing.enableImageCache
      );

      if (!description) {
        // Get frame description from AI service
        description = await aiService.analyzeImage(framePath);

        // Cache the description
        cacheImageDescription(
          framePath,
          description,
          cacheDir,
          imageDescriptionCache,
          config.videoProcessing.enableImageCache
        );
      }

      frameData.push({
        frameIndex: i,
        frameFile,
        timestamp: formatTimestamp(frameTimeSeconds),
        timeSeconds: frameTimeSeconds,
        description,
      });
    }

    return frameData;
  },

  /**
   * Analyze extracted frames to generate a narrative
   * @param {Object} extractionResult - Result from frame extraction
   * @param {Object} options - Options for analysis
   * @returns {Promise<Object>} - Analysis result with narrative and timestamps
   */
  async analyzeFrames(extractionResult, options = {}) {
    try {
      const {
        sessionId,
        framesDir,
        frameCount,
        frameInterval,
        videoDuration,
        processedDuration,
        truncated,
      } = extractionResult;

      console.log(`Analyzing frames from ${framesDir}`);

      // Filter frames to only include those with significant changes
      const significantFrameFiles =
        await frameExtractionService.filterSignificantFrames(
          framesDir,
          options
        );

      console.log(`Found ${significantFrameFiles.length} significant frames`);

      // Process frames sequentially
      const frameData = await this.processFrames(
        significantFrameFiles,
        framesDir,
        frameInterval,
        options
      );

      // Check if we have audio transcription data
      let audioTranscription = null;
      const audioPath = path.join(audioDir, `${sessionId}.mp3`);

      if (fs.existsSync(audioPath)) {
        console.log(
          `Found audio file for session ${sessionId}, transcribing...`
        );
        audioTranscription = await aiService.transcribeAudio(audioPath);
        console.log(
          `Audio transcription complete with ${
            audioTranscription.segments?.length || 0
          } segments`
        );
      } else {
        console.log(
          `No audio file found for session ${sessionId}, skipping transcription`
        );
      }

      // Generate a timeline from frame data, incorporating audio transcription if available
      const timelineResult = await this.generateTimelineWithAudioTranscription(
        frameData,
        audioTranscription
      );

      // For backward compatibility, also generate timestamps and narrative
      const timestamps = await aiService.generateTimestamps(frameData);
      const frameDescriptions = frameData.map((frame) => frame.description);
      //   const narrative = await aiService.generateNarrative(frameDescriptions);

      // Store the results
      const resultPath = path.join(outputDir, `${sessionId}-result.json`);
      const result = {
        sessionId,
        frameCount,
        significantFrameCount: significantFrameFiles.length,
        timeline: timelineResult.timeline,
        summary: timelineResult.summary,
        timestamps,
        // narrative,
        hasAudioTranscription: !!audioTranscription,
        videoDuration,
        processedDuration,
        truncated,
        processedAt: new Date().toISOString(),
      };

      fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

      return result;
    } catch (error) {
      console.error("Error in analyzeFrames:", error);
      throw new Error(`Failed to analyze frames: ${error.message}`);
    }
  },

  /**
   * Generate a timeline with audio transcription data
   * @param {Array<Object>} frameData - Array of frame data objects
   * @param {Object} audioTranscription - Audio transcription data
   * @returns {Promise<Object>} - Timeline result with summary and timeline
   */
  async generateTimelineWithAudioTranscription(frameData, audioTranscription) {
    try {
      // Generate a summary from all frame descriptions
      const frameDescriptions = frameData.map((frame) => frame.description);
      const summary = await aiService.generateSummary(frameDescriptions);

      // Process all frames sequentially
      const timeline = [];

      for (let i = 0; i < frameData.length; i++) {
        const frame = frameData[i];

        // Calculate the end time for this segment (time of next frame or +3 seconds for last frame)
        const nextFrame = frameData[i + 1];
        const endTimeSeconds = nextFrame
          ? nextFrame.timeSeconds
          : frame.timeSeconds + 3;

        // Get transcript range from audio transcription if available
        let audioTranscript = null;
        if (audioTranscription && audioTranscription.segments) {
          // Import findTranscriptRangeForTimestamp dynamically to avoid circular dependencies
          const { findTranscriptRangeForTimestamp } = await import(
            "../utils/videoUtils.js"
          );
          audioTranscript = findTranscriptRangeForTimestamp(
            frame.timeSeconds,
            endTimeSeconds,
            audioTranscription.segments
          );

          // If no range transcript found, try to get single timestamp transcript as fallback
          if (!audioTranscript) {
            const { findTranscriptForTimestamp } = await import(
              "../utils/videoUtils.js"
            );
            audioTranscript = findTranscriptForTimestamp(
              frame.timeSeconds,
              audioTranscription.segments
            );
          }
        }

        // Create the time range string (except for the last frame)
        let timestampDisplay = frame.timestamp;
        if (nextFrame) {
          const endTimestamp = formatTimestamp(endTimeSeconds);
          timestampDisplay = `${frame.timestamp} - ${endTimestamp}`;
        }

        // Create the timeline item with audio transcript
        timeline.push({
          timestamp: frame.timestamp,
          timestampDisplay: timestampDisplay,
          timeSeconds: frame.timeSeconds,
          endTimeSeconds: endTimeSeconds,
          description: frame.description,
          transcript: audioTranscript, // For backward compatibility
          audioTranscript: audioTranscript,
          frameIndex: frame.frameIndex,
          isAudioTranscript: !!audioTranscript,
        });
      }

      return {
        summary,
        timeline,
      };
    } catch (error) {
      console.error(
        "Error generating timeline with audio transcription:",
        error
      );
      // Fall back to AI service's timeline generation
      return aiService.generateTimeline(frameData);
    }
  },

  /**
   * Process a video to generate a narrative
   * @param {string} videoPath - Path to the video file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processing result
   */
  async processVideo(videoPath, options = {}) {
    try {
      console.log(`Processing video: ${videoPath}`);
      console.log(`Options: ${JSON.stringify(options)}`);

      // Create a unique session ID for this processing job
      const sessionId = uuidv4();

      // First, extract frames
      console.log("Starting frame extraction...");
      const extractionResult = await frameExtractionService.extractFrames(
        videoPath,
        {
          ...options,
          sessionId,
        }
      );

      console.log(
        "Frame extraction complete. Starting audio extraction and frame analysis in parallel..."
      );

      // Now run audio extraction and frame analysis in parallel
      const [analysisResult, audioResult] = await Promise.allSettled([
        this.analyzeFrames(extractionResult, options),
        frameExtractionService.extractAudio(videoPath, sessionId),
      ]);

      // Handle potential failures in frame analysis (critical)
      if (analysisResult.status === "rejected") {
        throw new Error(`Frame analysis failed: ${analysisResult.reason}`);
      }

      // Handle potential failures in audio extraction (non-critical)
      if (audioResult.status === "rejected") {
        console.warn(
          `Audio extraction failed: ${audioResult.reason}. Continuing without audio.`
        );
      }

      // Clean up temporary files if not in debug mode
      if (!options.debug) {
        // Keep the output JSON but remove the frames
        const sessionFramesDir = path.join(framesDir, sessionId);
        if (fs.existsSync(sessionFramesDir)) {
          fsExtra.removeSync(sessionFramesDir);
          console.log(`Cleaned up frames directory: ${sessionFramesDir}`);
        }
      }

      return analysisResult.value;
    } catch (error) {
      console.error("Error processing video:", error);
      throw new Error(`Failed to process video: ${error.message}`);
    }
  },

  /**
   * Clean up old processing files
   * @param {number} maxAgeHours - Maximum age in hours before deletion
   * @returns {Promise<number>} - Number of files/directories deleted
   */
  async cleanupOldProcessingFiles(maxAgeHours = 24) {
    return cleanupOldProcessingFiles(
      this.framesDir,
      this.outputDir,
      this.audioDir,
      this.cacheDir,
      maxAgeHours
    );
  },
};

export default videoProcessingService;
