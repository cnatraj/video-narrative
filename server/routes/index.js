import express from "express";
import healthRoutes from "./healthRoutes.js";
import videoRoutes from "./videoRoutes.js";
import youtubeRoutes from "./youtubeRoutes.js";

const router = express.Router();

// Root route
router.get("/", (req, res) => {
  res.status(200).json({
    message: "YouTube Narrative Service API",
    endpoints: [
      {
        path: "/api/health",
        method: "GET",
        description: "Check server health",
      },
      {
        path: "/api/process-youtube",
        method: "POST",
        description: "Process YouTube URL",
      },
      {
        path: "/api/upload-video",
        method: "POST",
        description: "Upload and process video",
      },
      {
        path: "/api/validate-youtube",
        method: "POST",
        description: "Validate YouTube URL",
      },
      {
        path: "/api/youtube-info",
        method: "POST",
        description: "Get YouTube video info",
      },
      {
        path: "/api/download-youtube",
        method: "POST",
        description: "Download YouTube video",
      },
    ],
  });
});

// Register all routes
router.use("/health", healthRoutes);
router.use("/", videoRoutes);
router.use("/", youtubeRoutes);

export default router;
