import express from "express";
import {
  processYouTubeUrl,
  uploadVideo,
  getProcessingStatus,
} from "../controllers/videoController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Route to handle YouTube URL processing
router.post("/process-youtube", processYouTubeUrl);

// Route to handle direct video uploads
router.post("/upload-video", upload.single("video"), uploadVideo);

// Route to check processing status
router.get("/processing-status/:sessionId", getProcessingStatus);

export default router;
