/**
 * Script to test video processing functionality
 */
import path from "path";
import { fileURLToPath } from "url";
import videoProcessingService from "../services/videoProcessingService.js";

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the sample video
const sampleVideoPath = path.join(__dirname, "..", "..", "sample-video.mp4");

async function testVideoProcessing() {
  console.log("Testing Video Processing Service...");

  try {
    console.log(`Processing sample video: ${sampleVideoPath}`);

    // Process the video
    const result = await videoProcessingService.processVideo(sampleVideoPath, {
      frameRate: 1,
      maxFrames: 10,
      debug: true, // Keep frames for inspection
    });

    console.log("\nProcessing complete!");
    console.log("Session ID:", result.sessionId);
    console.log("Total frames processed:", result.frameCount);
    console.log("Significant frames analyzed:", result.significantFrameCount);

    console.log("\nGenerated Narrative:");
    console.log(result.narrative);

    console.log("\nTimestamps:");
    result.timestamps.forEach((ts) => {
      console.log(`- ${ts.time}: ${ts.description}`);
    });

    console.log("\n✅ Video processing test completed successfully!");
  } catch (error) {
    console.error("❌ Error during video processing test:", error.message);
  }
}

// Run the test
testVideoProcessing();
