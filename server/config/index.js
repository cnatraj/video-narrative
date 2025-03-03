// Configuration settings for the server
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

export default {
  port: process.env.PORT || 3001,
  corsOptions: {
    origin: "*",
    optionsSuccessStatus: 200,
  },
  uploadDir: "uploads",
  downloadsDir: path.join(__dirname, "..", "downloads"),
  // Video download settings
  youtube: {
    maxFileSize: 500 * 1024 * 1024, // 500MB max file size
    cleanupInterval: 24, // Clean up files older than 24 hours
    defaultQuality: "highest",
  },
  // Video processing settings
  videoProcessing: {
    frameRate: 1, // Extract 1 frame per second
    maxDuration: 90, // Only process first 90 seconds of video
    frameDiffThreshold: 0.25, // Threshold for determining significant frame differences (0-1)
    audioFormat: "mp3", // Format for extracted audio
    audioBitrate: "64k", // Reduced bitrate for extracted audio (was 128k)
    // AI model settings
    aiModels: {
      imageAnalysis: "gpt-4o-mini", // Using gpt-4o-mini for all tasks
      narrative: "gpt-4o-mini", // Changed from gpt-3.5-turbo to gpt-4o-mini
      transcript: "gpt-4o-mini", // Changed from gpt-3.5-turbo to gpt-4o-mini
      summary: "gpt-4o-mini", // Changed from gpt-3.5-turbo to gpt-4o-mini
    },
    // Caching settings
    enableImageCache: true, // Enable caching of similar image descriptions
    cacheSimilarityThreshold: 0.8, // Threshold for determining similar images (0-1)
    // Batch processing
    batchSize: 5, // Number of frames to process in parallel
    skipFrameRatio: 2, // Process 1 out of every N frames for transcript generation
  },
};
