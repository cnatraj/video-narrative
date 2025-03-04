import express from "express";
import cors from "cors";
import morgan from "morgan";
import config from "./config/index.js";
import apiRoutes from "./routes/index.js";
import {
  ensureDirectories,
  setupCleanupScheduler,
} from "./utils/fileSystem.js";

// Initialize Express app
const app = express();
const PORT = process.env.PORT || config.port;

// Ensure directories exist before starting the server
ensureDirectories();

// Setup cleanup scheduler
setupCleanupScheduler();

// Log CORS configuration in development
if (process.env.NODE_ENV !== "production") {
  console.log("CORS configuration:", config.corsOptions);
}

// Middleware
app.use(cors(config.corsOptions));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS preflight handler for all routes
app.options("*", cors(config.corsOptions));

// API Routes
app.use("/api", apiRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`External URL: ${process.env.RENDER_EXTERNAL_URL}`);
  }
  if (process.env.FRONTEND_URL) {
    console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  }
});
