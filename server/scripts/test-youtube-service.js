import youtubeService from "../services/youtubeService.js";

// Test YouTube URL - this is a Creative Commons video
const TEST_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw";

async function testYoutubeService() {
  console.log("Testing YouTube Service...");

  try {
    // Test 1: Validate URL
    console.log("\n1. Testing URL validation...");
    const isValid = youtubeService.isValidYoutubeUrl(TEST_URL);
    console.log("Is valid URL:", isValid);

    // Test 2: Get video info
    console.log("\n2. Getting video info...");
    const videoInfo = await youtubeService.getVideoInfo(TEST_URL);
    console.log("Video info:");
    console.log("- Title:", videoInfo.title);
    console.log("- Author:", videoInfo.author);
    console.log("- Length:", videoInfo.lengthSeconds, "seconds");
    console.log("- Video ID:", videoInfo.videoId);

    // Test 3: Download video
    console.log("\n3. Downloading video...");
    const downloadResult = await youtubeService.downloadVideo(TEST_URL);
    console.log("Download complete!");
    console.log("- File path:", downloadResult.filePath);
    console.log("- Cached:", downloadResult.cached);

    // Test 4: Download again (should use cache)
    console.log("\n4. Downloading again (should use cache)...");
    const cacheResult = await youtubeService.downloadVideo(TEST_URL);
    console.log("Second download complete!");
    console.log("- File path:", cacheResult.filePath);
    console.log("- Cached:", cacheResult.cached);

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Error during YouTube service testing:", error.message);
  }
}

testYoutubeService();
