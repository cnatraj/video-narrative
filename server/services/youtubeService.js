/**
 * Service for handling YouTube video operations
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// import ytdl from "ytdl-core";
import ytdl from "@distube/ytdl-core";
import config from "../config/index.js";

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the downloads directory
const downloadsDir = path.join(__dirname, "..", "downloads");

// Create downloads directory if it doesn't exist
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

/**
 * YouTube Service for handling video downloads and information retrieval
 */
const youtubeService = {
  /**
   * Validate if a URL is a valid YouTube URL
   * @param {string} url - The URL to validate
   * @returns {boolean} - Whether the URL is valid
   */
  isValidYoutubeUrl(url) {
    try {
      return ytdl.validateURL(url);
    } catch (error) {
      console.error("Error validating YouTube URL:", error);
      return false;
    }
  },

  /**
   * Get information about a YouTube video
   * @param {string} url - The YouTube URL
   * @returns {Promise<Object>} - Video information
   */
  async getVideoInfo(url) {
    try {
      console.log("url", url);
      const info = await ytdl.getInfo(url);
      return {
        videoId: info.videoDetails.videoId,
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        lengthSeconds: parseInt(info.videoDetails.lengthSeconds),
        isPrivate: info.videoDetails.isPrivate,
        isLiveContent: info.videoDetails.isLiveContent,
        thumbnailUrl: info.videoDetails.thumbnails[0]?.url || null,
      };
    } catch (error) {
      console.error("Error getting video info:", error);
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  },

  /**
   * Download a YouTube video
   * @param {string} url - The YouTube URL
   * @param {Object} options - Download options
   * @returns {Promise<Object>} - Download result with file path and metadata
   */
  async downloadVideo(url, options = {}) {
    try {
      // Validate the URL
      if (!this.isValidYoutubeUrl(url)) {
        throw new Error("Invalid YouTube URL");
      }

      // Get video info
      const info = await this.getVideoInfo(url);

      // Check if video is private
      if (info.isPrivate) {
        throw new Error("Cannot download private videos");
      }

      // Check if video is live content
      if (info.isLiveContent) {
        throw new Error("Cannot download live content");
      }

      // Create a safe filename from the video title
      const safeTitle = info.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const filename = `${info.videoId}-${safeTitle}.mp4`;
      const outputPath = path.join(downloadsDir, filename);

      // Check if file already exists (simple caching)
      if (fs.existsSync(outputPath) && !options.forceDownload) {
        console.log(`Video already downloaded: ${outputPath}`);
        return {
          filePath: outputPath,
          info,
          cached: true,
        };
      }

      // Set up download options
      const downloadOptions = {
        quality: options.quality || "highest",
        filter: options.filter || "audioandvideo",
      };

      // Create download promise
      const downloadPromise = new Promise((resolve, reject) => {
        const video = ytdl(url, downloadOptions);
        const fileStream = fs.createWriteStream(outputPath);

        // Track download progress
        let downloadedBytes = 0;
        let totalBytes = 0;

        video.on("info", (info, format) => {
          totalBytes = format.contentLength;
          console.log(`Starting download: ${info.videoDetails.title}`);
        });

        video.on("progress", (chunkLength, downloaded, total) => {
          downloadedBytes = downloaded;
          const percent = ((downloaded / total) * 100).toFixed(2);
          process.stdout.write(`Downloaded ${percent}%\r`);
        });

        video.on("error", (err) => {
          console.error("Error downloading video:", err);
          // Clean up partial file
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          reject(err);
        });

        fileStream.on("error", (err) => {
          console.error("Error writing video file:", err);
          reject(err);
        });

        fileStream.on("finish", () => {
          console.log(`\nDownload complete: ${outputPath}`);
          resolve({
            filePath: outputPath,
            info,
            cached: false,
            downloadedBytes,
            totalBytes,
          });
        });

        // Pipe the video to the file
        video.pipe(fileStream);
      });

      // Return the download result
      return await downloadPromise;
    } catch (error) {
      console.error("Error in downloadVideo:", error);
      throw new Error(`Failed to download video: ${error.message}`);
    }
  },

  /**
   * Clean up old downloaded videos
   * @param {number} maxAgeHours - Maximum age in hours before deletion
   * @returns {Promise<number>} - Number of files deleted
   */
  async cleanupOldDownloads(maxAgeHours = 24) {
    try {
      const files = fs.readdirSync(downloadsDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(downloadsDir, file);
        const stats = fs.statSync(filePath);
        const fileAgeHours = (now - stats.mtimeMs) / (1000 * 60 * 60);

        if (fileAgeHours > maxAgeHours) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`Deleted old file: ${file}`);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("Error cleaning up old downloads:", error);
      return 0;
    }
  },
};

export default youtubeService;
