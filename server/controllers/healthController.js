/**
 * Controller for health-related endpoints
 */
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const checkHealth = (req, res) => {
  // Check if OpenAI API key is configured - modified check to only look for empty values
  const openAiConfigured =
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== "";

  res.status(200).json({
    status: "ok",
    message: "Server is running",
    openAiConfigured,
  });
};

// Simple ping endpoint for uptime monitoring services
export const pingHealth = (req, res) => {
  // Log ping requests if in development mode
  if (process.env.NODE_ENV === "development") {
    console.log(`[${new Date().toISOString()}] Health ping received`);
  }

  // Return a minimal response to save bandwidth
  res.status(200).send("OK");
};
