/**
 * Controller for YouTube-specific operations
 */
import youtubeService from "../services/youtubeService.js";

/**
 * Validate a YouTube URL
 */
export const validateYoutubeUrl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const isValid = youtubeService.isValidYoutubeUrl(url);

    res.status(200).json({
      valid: isValid,
      url,
    });
  } catch (error) {
    console.error("Error validating YouTube URL:", error);
    res.status(500).json({ error: "Failed to validate YouTube URL" });
  }
};

/**
 * Get information about a YouTube video
 */
export const getVideoInfo = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    if (!youtubeService.isValidYoutubeUrl(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const videoInfo = await youtubeService.getVideoInfo(url);

    res.status(200).json({
      success: true,
      videoInfo,
    });
  } catch (error) {
    console.error("Error getting video info:", error);
    res
      .status(500)
      .json({ error: `Failed to get video info: ${error.message}` });
  }
};

/**
 * Download a YouTube video
 */
export const downloadVideo = async (req, res) => {
  try {
    const { url, quality, forceDownload } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    if (!youtubeService.isValidYoutubeUrl(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const options = {
      quality: quality || "highest",
      forceDownload: forceDownload || false,
    };

    // Start the download process
    const result = await youtubeService.downloadVideo(url, options);

    res.status(200).json({
      success: true,
      message: result.cached
        ? "Video retrieved from cache"
        : "Video downloaded successfully",
      videoPath: result.filePath,
      videoInfo: result.info,
      cached: result.cached,
    });
  } catch (error) {
    console.error("Error downloading video:", error);
    res
      .status(500)
      .json({ error: `Failed to download video: ${error.message}` });
  }
};
