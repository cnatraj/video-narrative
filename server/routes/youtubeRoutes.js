import express from "express";
import {
  validateYoutubeUrl,
  getVideoInfo,
  downloadVideo,
} from "../controllers/youtubeController.js";

const router = express.Router();

// YouTube-specific routes
router.post("/validate-youtube", validateYoutubeUrl);
router.post("/youtube-info", getVideoInfo);
router.post("/download-youtube", downloadVideo);

export default router;
