/**
 * Service for AI-powered video analysis
 */
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Log API key status (without revealing the key)
console.log(
  "OpenAI API Key Status:",
  process.env.OPENAI_API_KEY
    ? `Configured (${process.env.OPENAI_API_KEY.substring(
        0,
        3
      )}...${process.env.OPENAI_API_KEY.substring(
        process.env.OPENAI_API_KEY.length - 3
      )})`
    : "Not configured"
);

/**
 * AI Service for analyzing video frames and generating narratives
 */
const aiService = {
  /**
   * Analyze an image using OpenAI's Vision API
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<string>} - Description of the image
   */
  async analyzeImage(imagePath) {
    try {
      // Check if OpenAI API key is configured - modified check to only look for empty values
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY.trim() === ""
      ) {
        console.warn("OpenAI API key not configured. Using mock analysis.");
        return this.generateMockImageDescription();
      }

      // Read the image file as base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      // Call OpenAI API to analyze the image
      // Using gpt-4o-mini for faster processing
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe what's happening in this video frame in 1-2 sentences.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000, // Keeping token count at 1000
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error("Error analyzing image with OpenAI:", error);
      return this.generateMockImageDescription();
    }
  },

  /**
   * Transcribe audio using OpenAI's Whisper API
   * @param {string} audioPath - Path to the audio file
   * @returns {Promise<Object>} - Transcription result with text and timestamps
   */
  async transcribeAudio(audioPath) {
    try {
      // Check if OpenAI API key is configured
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY.trim() === ""
      ) {
        console.warn(
          "OpenAI API key not configured. Using mock transcription."
        );
        return this.generateMockTranscription();
      }

      console.log(`Transcribing audio file: ${audioPath}`);

      // Check if file exists and is readable
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // Create a read stream for the audio file
      const audioFile = fs.createReadStream(audioPath);

      // Call OpenAI API to transcribe the audio
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      });

      console.log(
        `Transcription complete with ${
          transcription.segments?.length || 0
        } segments`
      );

      return {
        text: transcription.text,
        segments: transcription.segments.map((segment) => ({
          id: segment.id,
          start: segment.start,
          end: segment.end,
          text: segment.text,
        })),
      };
    } catch (error) {
      console.error("Error transcribing audio with OpenAI:", error);
      return this.generateMockTranscription();
    }
  },

  /**
   * Generate a timeline of frame descriptions with timestamps
   * @param {Array<Object>} frameData - Array of objects with frame descriptions and timestamps
   * @returns {Promise<Object>} - Timeline object with summary and frame descriptions
   */
  async generateTimeline(frameData) {
    try {
      // Check if OpenAI API key is configured
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY.trim() === ""
      ) {
        console.warn("OpenAI API key not configured. Using mock timeline.");
        return this.generateMockTimeline(frameData);
      }

      // Generate a summary from all frame descriptions
      const frameDescriptions = frameData.map((frame) => frame.description);
      const summary = await this.generateSummary(frameDescriptions);

      // Process all frames sequentially
      const timeline = [];

      for (let i = 0; i < frameData.length; i++) {
        const frame = frameData[i];

        timeline.push({
          timestamp: frame.timestamp,
          timeSeconds: frame.timeSeconds,
          description: frame.description,
          frameIndex: frame.frameIndex,
        });
      }

      return {
        summary,
        timeline,
      };
    } catch (error) {
      console.error("Error generating timeline with OpenAI:", error);
      return this.generateMockTimeline(frameData);
    }
  },

  /**
   * Generate a summary from frame descriptions
   * @param {Array<string>} frameDescriptions - Descriptions of video frames
   * @returns {Promise<string>} - Summary of the video
   */
  async generateSummary(frameDescriptions) {
    try {
      // Check if OpenAI API key is configured
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY.trim() === ""
      ) {
        console.warn("OpenAI API key not configured. Using mock summary.");
        return this.generateMockSummary(frameDescriptions.length);
      }

      // Use all frame descriptions instead of selecting representative frames
      const prompt = `
        I have analyzed ${
          frameDescriptions.length
        } key frames from a video and have the following descriptions:
        
        ${frameDescriptions
          .map((desc, i) => `Frame ${i + 1}: ${desc}`)
          .join("\n\n")}
        
        Based on these frame descriptions, generate a concise summary (2-3 sentences) that captures the essence of the video.
      `;

      // Call OpenAI API to generate the summary
      // Using gpt-4o-mini instead of gpt-3.5-turbo
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert video analyst who creates concise summaries from video frame descriptions.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000, // Keeping token count at 1000
        temperature: 0.5, // Lower temperature for more focused responses
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error("Error generating summary with OpenAI:", error);
      return this.generateMockSummary(frameDescriptions.length);
    }
  },

  /**
   * Generate timestamps with descriptions from frame descriptions
   * @param {Array<Object>} frameData - Array of objects with frame descriptions and timestamps
   * @returns {Promise<Array<Object>>} - Array of timestamp objects
   */
  async generateTimestamps(frameData) {
    try {
      // Check if OpenAI API key is configured - modified check to only look for empty values
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY.trim() === ""
      ) {
        console.warn("OpenAI API key not configured. Using mock timestamps.");
        return this.generateMockTimestamps(frameData.length);
      }

      // Use all frames instead of filtering to significant frames
      const selectedFrames = frameData;

      // Create timestamps from the selected frames
      return selectedFrames.map((frame) => ({
        time: frame.timestamp,
        description: frame.description.split(".")[0] + ".", // Take first sentence for brevity
      }));
    } catch (error) {
      console.error("Error generating timestamps with OpenAI:", error);
      return this.generateMockTimestamps(frameData.length);
    }
  },

  /**
   * Select representative frames from a larger set
   * @param {Array<Object>} frames - Array of frame data or descriptions
   * @param {number} maxCount - Maximum number of frames to select
   * @returns {Array<Object>} - Selected representative frames
   */
  selectRepresentativeFrames(frames, maxCount) {
    // If we already have fewer frames than the max, return all frames
    if (frames.length <= maxCount) {
      return frames;
    }

    // Always include first and last frame
    const result = [frames[0]];

    // Add evenly spaced frames in between
    const step = Math.floor(frames.length / (maxCount - 2));
    for (let i = step; i < frames.length - 1; i += step) {
      result.push(frames[i]);
    }

    // Add the last frame if it's not already included
    if (result.length < maxCount) {
      result.push(frames[frames.length - 1]);
    }

    return result;
  },

  /**
   * Generate a mock description for an image (fallback)
   * @returns {string} - Mock image description
   */
  generateMockImageDescription() {
    const descriptions = [
      "A person is presenting information to the camera, gesturing with their hands to emphasize key points.",
      "The video shows a detailed view of a product with its features highlighted.",
      "A scenic landscape is displayed, with mountains in the background and a lake in the foreground.",
      "Multiple people are engaged in a discussion around a table with documents spread out.",
      "A demonstration of a software application with cursor movements highlighting different features.",
      "An animated sequence explaining a complex concept with visual aids and diagrams.",
      "A close-up shot of hands performing a detailed task with precision.",
      "A wide shot of an urban environment with people moving through the scene.",
    ];

    return descriptions[Math.floor(Math.random() * descriptions.length)];
  },

  /**
   * Generate a mock transcription result (fallback)
   * @returns {Object} - Mock transcription with text and segments
   */
  generateMockTranscription() {
    // Generate a mock full transcript
    const fullTranscript =
      "Welcome to this video. Today we're going to explore an interesting topic that I think you'll find fascinating. As you can see, I've prepared some examples to help illustrate the key points. Let's dive right in and take a closer look at what makes this subject so important. By the end of this video, you'll have a much better understanding of how everything works together.";

    // Generate mock segments with timestamps
    const segments = [];
    const sentences = fullTranscript
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    let currentTime = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (sentence.length === 0) continue;

      // Calculate a realistic duration based on word count (approx 2-3 words per second)
      const wordCount = sentence.split(/\s+/).length;
      const duration = Math.max(1, wordCount / 2.5);

      segments.push({
        id: i,
        start: currentTime,
        end: currentTime + duration,
        text: sentence + ".",
      });

      currentTime += duration;
    }

    return {
      text: fullTranscript,
      segments: segments,
    };
  },

  /**
   * Generate a mock timeline (fallback)
   * @param {Array<Object>} frameData - Array of frame data
   * @returns {Object} - Mock timeline
   */
  generateMockTimeline(frameData) {
    // Generate a mock summary
    const summary = this.generateMockSummary(frameData.length);

    // Create timeline entries from frame data
    const timeline = frameData.map((frame, index) => {
      return {
        timestamp: frame.timestamp,
        timeSeconds: frame.timeSeconds || index * 5, // Fallback if timeSeconds is not provided
        description: frame.description || this.generateMockImageDescription(),
        frameIndex: frame.frameIndex || index,
      };
    });

    return {
      summary,
      timeline,
    };
  },

  /**
   * Generate a mock summary (fallback)
   * @param {number} frameCount - Number of frames
   * @returns {string} - Mock summary
   */
  generateMockSummary(frameCount) {
    const summaries = [
      "This video presents a comprehensive overview of a product, demonstrating its key features and benefits through visual examples.",
      "The video showcases a tutorial on a specific process, breaking down complex steps into easily understandable visual instructions.",
      "This educational content explains a concept through visual aids, animations, and clear explanations from the presenter.",
      "The video captures a natural scene with changing environmental conditions and wildlife interactions throughout the duration.",
      "This presentation covers important information with supporting visuals, charts, and demonstrations to illustrate key points.",
    ];

    return summaries[Math.floor(Math.random() * summaries.length)];
  },

  /**
   * Generate mock timestamps (fallback)
   * @param {number} frameCount - Number of frames
   * @returns {Array<Object>} - Mock timestamps
   */
  generateMockTimestamps(frameCount) {
    const timestamps = [];
    const videoDuration = frameCount; // Assuming 1 frame per second

    // Create some mock timestamps at regular intervals
    const numTimestamps = Math.min(5, frameCount);
    const interval = Math.floor(videoDuration / numTimestamps);

    for (let i = 0; i < numTimestamps; i++) {
      const timeSeconds = i * interval;
      timestamps.push({
        time: this.formatTimestamp(timeSeconds),
        description: `Scene ${i + 1}: ${this.generateMockTimestampDescription(
          i
        )}`,
      });
    }

    return timestamps;
  },

  /**
   * Generate a mock description for a timestamp (fallback)
   * @param {number} index - Index of the timestamp
   * @returns {string} - Mock description
   */
  generateMockTimestampDescription(index) {
    const descriptions = [
      "Introduction to the topic",
      "Main demonstration begins",
      "Key point explanation",
      "Technical demonstration",
      "Summary of findings",
      "Conclusion and next steps",
    ];

    return descriptions[index % descriptions.length];
  },

  /**
   * Generate a mock narrative for the video (fallback)
   * @param {number} frameCount - Number of frames extracted
   * @returns {string} - Mock narrative
   */
  generateMockNarrative(frameCount) {
    return `This video is approximately ${frameCount} seconds long and contains several key sections.

The video begins with an introduction to the main topic, setting the context for the viewer. The presenter speaks clearly and establishes the purpose of the video.

In the middle section, there is a detailed demonstration of the core concepts, with visual examples that illustrate the key points. The presenter uses graphics and animations to enhance understanding.

Towards the end, the video summarizes the main points and provides a conclusion with recommendations for further exploration of the topic.

Throughout the video, the presenter maintains good pacing and clear articulation, making the content accessible to viewers of various knowledge levels.`;
  },

  /**
   * Format a timestamp in seconds to HH:MM:SS format
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted timestamp
   */
  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":");
  },
};

export default aiService;
