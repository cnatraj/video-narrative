/**
 * Utility functions for caching image descriptions
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Generate a hash for an image file to use for caching
 * @param {string} imagePath - Path to the image file
 * @returns {string} - Hash of the image
 */
export const generateImageHash = (imagePath) => {
  try {
    const stats = fs.statSync(imagePath);
    const fileSize = stats.size;
    const fileName = path.basename(imagePath);

    // Create a simple hash based on file size and name
    return crypto
      .createHash("md5")
      .update(`${fileName}-${fileSize}`)
      .digest("hex");
  } catch (error) {
    console.error("Error generating image hash:", error);
    // Return a random hash if there's an error
    return crypto.randomBytes(16).toString("hex");
  }
};

/**
 * Check if an image description is cached and return it if available
 * @param {string} imagePath - Path to the image file
 * @param {string} cacheDir - Directory containing cache files
 * @param {Map} imageDescriptionCache - In-memory cache for image descriptions
 * @param {boolean} enableCache - Whether caching is enabled
 * @returns {string|null} - Cached description or null if not found
 */
export const getCachedImageDescription = (
  imagePath,
  cacheDir,
  imageDescriptionCache,
  enableCache = true
) => {
  if (!enableCache) {
    return null;
  }

  try {
    const imageHash = generateImageHash(imagePath);

    // Check in-memory cache first
    if (imageDescriptionCache && imageDescriptionCache.has(imageHash)) {
      console.log(
        `Using in-memory cached description for ${path.basename(imagePath)}`
      );
      return imageDescriptionCache.get(imageHash);
    }

    // Check file cache
    const cachePath = path.join(cacheDir, `${imageHash}.txt`);
    if (fs.existsSync(cachePath)) {
      const cachedDescription = fs.readFileSync(cachePath, "utf8");
      console.log(
        `Using file-cached description for ${path.basename(imagePath)}`
      );

      // Update in-memory cache if it exists
      if (imageDescriptionCache) {
        imageDescriptionCache.set(imageHash, cachedDescription);
      }

      return cachedDescription;
    }

    return null;
  } catch (error) {
    console.error("Error checking image cache:", error);
    return null;
  }
};

/**
 * Cache an image description for future use
 * @param {string} imagePath - Path to the image file
 * @param {string} description - Description to cache
 * @param {string} cacheDir - Directory containing cache files
 * @param {Map} imageDescriptionCache - In-memory cache for image descriptions
 * @param {boolean} enableCache - Whether caching is enabled
 */
export const cacheImageDescription = (
  imagePath,
  description,
  cacheDir,
  imageDescriptionCache,
  enableCache = true
) => {
  if (!enableCache) {
    return;
  }

  try {
    const imageHash = generateImageHash(imagePath);

    // Update in-memory cache if it exists
    if (imageDescriptionCache) {
      imageDescriptionCache.set(imageHash, description);
    }

    // Update file cache
    const cachePath = path.join(cacheDir, `${imageHash}.txt`);
    fs.writeFileSync(cachePath, description);

    console.log(`Cached description for ${path.basename(imagePath)}`);
  } catch (error) {
    console.error("Error caching image description:", error);
  }
};
