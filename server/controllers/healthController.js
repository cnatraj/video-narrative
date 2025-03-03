/**
 * Controller for health-related endpoints
 */
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const checkHealth = (req, res) => {
  console.log("checkHealth", checkHealth);

  // Check if OpenAI API key is configured
  const openAiConfigured =
    process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== "your_openai_api_key_here";

  res.status(200).json({
    status: "ok",
    message: "Server is running",
    openAiConfigured,
  });
};
