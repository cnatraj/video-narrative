import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import config from "../config/index.js";

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "..", config.uploadDir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Create a more secure filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname);
    cb(null, `${timestamp}-${randomString}${extension}`);
  },
});

// File filter to only allow video files
const fileFilter = (req, file, cb) => {
  // Accept only video mime types
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed!"), false);
  }
};

// Configure upload limits
const limits = {
  fileSize: config.youtube.maxFileSize, // Max file size (e.g., 500MB)
  files: 1, // Only allow one file at a time
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits,
});

export default upload;
