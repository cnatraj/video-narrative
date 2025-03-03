/**
 * Script to clear image and description caches
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import videoProcessingService from "../services/videoProcessingService.js";

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Clear all caches used by the video processing service
 */
async function clearCaches() {
  console.log("Clearing all caches...");

  try {
    // Clear in-memory image description cache
    if (global.imageDescriptionCache) {
      global.imageDescriptionCache.clear();
      console.log("✅ In-memory image description cache cleared");
    } else {
      console.log("ℹ️ No in-memory cache found to clear");
    }

    // Clear file-based cache
    const cacheDir = videoProcessingService.cacheDir;

    if (fs.existsSync(cacheDir)) {
      const cacheFiles = fs.readdirSync(cacheDir);

      if (cacheFiles.length > 0) {
        let deletedCount = 0;

        for (const file of cacheFiles) {
          const filePath = path.join(cacheDir, file);
          try {
            fs.unlinkSync(filePath);
            deletedCount++;
          } catch (err) {
            console.error(`Failed to delete cache file ${file}:`, err);
          }
        }

        console.log(`✅ Deleted ${deletedCount} cache files from ${cacheDir}`);
      } else {
        console.log(`ℹ️ No cache files found in ${cacheDir}`);
      }
    } else {
      console.log(`ℹ️ Cache directory ${cacheDir} does not exist`);
    }

    // Force reset the global cache object to ensure it's completely empty
    global.imageDescriptionCache = new Map();
    console.log("✅ Global cache object reset");

    console.log("✅ All caches have been cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing caches:", error);
  }
}

// Run the function
clearCaches();
