/**
 * File system utility functions
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import videoProcessingService from "../services/videoProcessingService.js";
import youtubeService from "../services/youtubeService.js";

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ensure required directories exist
 */
export const ensureDirectories = () => {
  const dirs = [
    path.join(__dirname, "..", "downloads"),
    path.join(__dirname, "..", "uploads"),
    path.join(__dirname, "..", "processing"),
    path.join(__dirname, "..", "processing/frames"),
    path.join(__dirname, "..", "processing/output"),
    path.join(__dirname, "..", "processing/audio"),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

/**
 * Setup cleanup scheduler for old files
 */
export const setupCleanupScheduler = () => {
  const CLEANUP_INTERVAL = 1000 * 60 * 60; // 1 hour
  const MAX_AGE_HOURS = 24; // 24 hours

  // Run cleanup on startup
  console.log("Running initial cleanup...");
  Promise.all([
    videoProcessingService.cleanupOldProcessingFiles(MAX_AGE_HOURS),
    youtubeService.cleanupOldDownloads(MAX_AGE_HOURS),
  ]).then(([processingCount, downloadsCount]) => {
    console.log(
      `Initial cleanup complete. Removed ${processingCount} processing files and ${downloadsCount} downloads.`
    );
  });

  // Schedule regular cleanup
  setInterval(() => {
    console.log("Running scheduled cleanup...");
    Promise.all([
      videoProcessingService.cleanupOldProcessingFiles(MAX_AGE_HOURS),
      youtubeService.cleanupOldDownloads(MAX_AGE_HOURS),
    ]).then(([processingCount, downloadsCount]) => {
      console.log(
        `Scheduled cleanup complete. Removed ${processingCount} processing files and ${downloadsCount} downloads.`
      );
    });
  }, CLEANUP_INTERVAL);
};
