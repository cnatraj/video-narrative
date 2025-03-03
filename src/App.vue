<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-title>YouTube Narrative Service</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="checkServerHealth">
        <v-icon>mdi-server</v-icon>
      </v-btn>
      <v-btn
        icon
        href="https://github.com/yourusername/youtube-narrative-service"
        target="_blank"
      >
        <v-icon>mdi-github</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
            <v-card class="mx-auto mt-6" elevation="8">
              <v-card-title class="text-h5 font-weight-bold">
                Generate Video Narrative
              </v-card-title>

              <v-card-text>
                <p class="mb-4">
                  Enter a YouTube URL or upload a video to generate a narrative
                  description of what's happening in the video.
                </p>

                <v-tabs v-model="activeTab" grow>
                  <v-tab value="youtube">YouTube URL</v-tab>
                  <v-tab value="upload">Upload Video</v-tab>
                </v-tabs>

                <v-window v-model="activeTab" class="mt-4">
                  <v-window-item value="youtube">
                    <v-form @submit.prevent="processYouTubeVideo">
                      <v-text-field
                        v-model="youtubeUrl"
                        label="YouTube URL"
                        placeholder="https://www.youtube.com/watch?v=..."
                        variant="outlined"
                        :rules="[(v) => !!v || 'URL is required', urlValidator]"
                        clearable
                        prepend-inner-icon="mdi-youtube"
                      ></v-text-field>

                      <v-btn
                        block
                        color="primary"
                        size="large"
                        type="submit"
                        :loading="loading"
                        :disabled="!isValidUrl"
                      >
                        Generate Narrative
                      </v-btn>
                    </v-form>
                  </v-window-item>

                  <v-window-item value="upload">
                    <v-form @submit.prevent="processUploadedVideo">
                      <v-file-input
                        v-model="videoFile"
                        label="Upload Video"
                        accept="video/*"
                        variant="outlined"
                        prepend-icon="mdi-video"
                        :rules="[(v) => !!v || 'Video file is required']"
                        show-size
                      ></v-file-input>

                      <v-btn
                        block
                        color="primary"
                        size="large"
                        type="submit"
                        :loading="loading"
                        :disabled="!videoFile"
                      >
                        Upload & Generate Narrative
                      </v-btn>
                    </v-form>
                  </v-window-item>
                </v-window>
              </v-card-text>
            </v-card>

            <v-card v-if="processingStatus" class="mt-6" elevation="8">
              <v-card-title class="text-h5 font-weight-bold">
                Processing Status
              </v-card-title>

              <v-card-text>
                <v-progress-linear
                  v-if="processingStatus === 'processing'"
                  indeterminate
                  color="primary"
                  class="mb-4"
                ></v-progress-linear>

                <v-alert
                  :type="processingStatus === 'completed' ? 'success' : 'info'"
                  :text="processingStatusMessage"
                  class="mb-4"
                ></v-alert>
              </v-card-text>
            </v-card>

            <v-card v-if="showPreview" class="mt-6" elevation="8">
              <v-card-title class="text-h5 font-weight-bold">
                Video Preview
              </v-card-title>

              <v-card-text>
                <div class="video-container">
                  <iframe
                    v-if="embedUrl"
                    :src="embedUrl"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    class="video-iframe"
                  ></iframe>
                  <video
                    v-else-if="videoFileUrl"
                    controls
                    class="video-player"
                    ref="videoPlayer"
                  >
                    <source :src="videoFileUrl" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </v-card-text>
            </v-card>

            <v-card v-if="summary" class="mt-6" elevation="8">
              <v-card-title class="text-h5 font-weight-bold">
                Video Summary
              </v-card-title>

              <v-card-text>
                <p class="summary-text">{{ summary }}</p>
                <v-alert v-if="truncatedInfo" type="info" class="mt-4">
                  {{ truncatedInfo }}
                </v-alert>
              </v-card-text>
            </v-card>

            <v-card
              v-if="timeline && timeline.length > 0"
              class="mt-6"
              elevation="8"
            >
              <v-card-title class="text-h5 font-weight-bold">
                Video Timeline
                <v-spacer></v-spacer>
                <v-btn icon @click="copyTimeline" :disabled="!timeline">
                  <v-icon>mdi-content-copy</v-icon>
                </v-btn>
              </v-card-title>

              <v-card-text>
                <v-timeline density="compact" align="start">
                  <v-timeline-item
                    v-for="(item, index) in timeline"
                    :key="index"
                    :dot-color="getTimelineColor(index, item)"
                    size="small"
                  >
                    <div class="timeline-item-content">
                      <v-chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        @click="seekToTimestamp(item.timestamp)"
                        class="timestamp-chip mb-2"
                      >
                        {{ item.timestampDisplay || item.timestamp }}
                      </v-chip>
                      <p class="mb-2">{{ item.description }}</p>

                      <!-- Audio transcript (if available) -->
                      <v-expand-transition v-if="item.audioTranscript">
                        <div class="transcript-container audio-transcript">
                          <div class="d-flex align-center">
                            <v-icon size="small" color="success" class="mr-2"
                              >mdi-microphone</v-icon
                            >
                            <span class="text-caption text-success"
                              >Audio Transcript:</span
                            >
                          </div>
                          <p class="transcript-text">
                            {{ item.audioTranscript }}
                          </p>
                        </div>
                      </v-expand-transition>
                    </div>
                  </v-timeline-item>
                </v-timeline>
              </v-card-text>
            </v-card>

            <v-card v-if="narrative" class="mt-6" elevation="8">
              <v-card-title class="text-h5 font-weight-bold">
                Full Narrative
                <v-spacer></v-spacer>
                <v-btn icon @click="copyNarrative" :disabled="!narrative">
                  <v-icon>mdi-content-copy</v-icon>
                </v-btn>
              </v-card-title>

              <v-card-text>
                <div v-if="timestamps && timestamps.length > 0" class="mb-4">
                  <h3 class="text-subtitle-1 font-weight-bold mb-2">
                    Timestamps:
                  </h3>
                  <v-chip-group>
                    <v-chip
                      v-for="(timestamp, index) in timestamps"
                      :key="index"
                      color="primary"
                      variant="outlined"
                      @click="seekToTimestamp(timestamp.time)"
                    >
                      {{ timestamp.time }} - {{ timestamp.description }}
                    </v-chip>
                  </v-chip-group>
                </div>
                <p class="narrative-text">{{ narrative }}</p>
              </v-card-text>
            </v-card>

            <v-card v-if="!openAiConfigured" class="mt-6" elevation="8">
              <v-card-title class="text-h5 font-weight-bold text-warning">
                <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
                OpenAI API Key Not Configured
              </v-card-title>

              <v-card-text>
                <p>
                  The OpenAI API key is not configured. The application will use
                  mock data instead of real AI analysis.
                </p>
                <p>To enable real AI analysis:</p>
                <ol>
                  <li>
                    Get an API key from
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      >OpenAI
                    </a>
                  </li>
                  <li>
                    Update the <code>OPENAI_API_KEY</code> value in the
                    <code>.env</code> file
                  </li>
                  <li>Restart the server</li>
                </ol>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-footer app class="d-flex justify-center">
      <span
        >&copy; {{ new Date().getFullYear() }} YouTube Narrative Service</span
      >
    </v-footer>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false"> Close </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { api } from "./services/api";

// State
const activeTab = ref("youtube");
const youtubeUrl = ref("");
const videoFile = ref(null);
const videoFileUrl = ref(null);
const narrative = ref("");
const summary = ref("");
const timeline = ref([]);
const timestamps = ref([]);
const loading = ref(false);
const processingStatus = ref(null); // 'processing', 'completed', or null
const processingStatusMessage = ref("");
const processingSessionId = ref(null);
let processingCheckInterval = null;
const snackbar = ref({
  show: false,
  text: "",
  color: "success",
});
const showPreview = ref(false);
const openAiConfigured = ref(false);
const videoPlayer = ref(null);
const truncatedInfo = ref(null);

// Computed properties
const isValidUrl = computed(() => {
  return youtubeUrl.value && urlValidator(youtubeUrl.value) === true;
});

const videoId = computed(() => {
  if (!youtubeUrl.value) return null;

  try {
    const url = new URL(youtubeUrl.value);
    if (url.hostname === "youtu.be") {
      return url.pathname.substring(1);
    }

    const params = new URLSearchParams(url.search);
    return params.get("v");
  } catch (e) {
    return null;
  }
});

const embedUrl = computed(() => {
  if (!videoId.value) return "";
  return `https://www.youtube.com/embed/${videoId.value}`;
});

// Methods
const checkOpenAiConfig = async () => {
  try {
    const response = await api.checkHealth();
    openAiConfigured.value = response.data.openAiConfigured || false;
  } catch (error) {
    console.error("Error checking OpenAI configuration:", error);
    openAiConfigured.value = false;
  }
};

const urlValidator = (url) => {
  try {
    const parsedUrl = new URL(url);
    const isYouTube =
      parsedUrl.hostname === "www.youtube.com" ||
      parsedUrl.hostname === "youtube.com" ||
      parsedUrl.hostname === "youtu.be";

    if (!isYouTube) {
      return "Please enter a valid YouTube URL";
    }

    if (parsedUrl.hostname === "youtu.be" && parsedUrl.pathname.length <= 1) {
      return "Invalid YouTube short URL";
    }

    if (
      (parsedUrl.hostname === "youtube.com" ||
        parsedUrl.hostname === "www.youtube.com") &&
      !new URLSearchParams(parsedUrl.search).get("v")
    ) {
      return "Missing video ID in YouTube URL";
    }

    return true;
  } catch (e) {
    return "Please enter a valid URL";
  }
};

const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes > 0) {
    return `${minutes} minute${
      minutes !== 1 ? "s" : ""
    } ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""}`;
  } else {
    return `${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""}`;
  }
};

const processYouTubeVideo = async () => {
  if (!isValidUrl.value) return;

  loading.value = true;
  showPreview.value = true;
  resetProcessingState();

  try {
    // Call the API service to process the YouTube URL
    const response = await api.processYouTubeUrl(youtubeUrl.value);

    // Check if we have a processing result
    if (response.data.processingResult) {
      narrative.value = response.data.processingResult.narrative;
      summary.value = response.data.processingResult.summary;
      timeline.value = processTimelineData(
        response.data.processingResult.timeline
      );
      timestamps.value = response.data.processingResult.timestamps;

      // Check if video was truncated
      if (response.data.processingResult.truncated) {
        const totalDuration = formatDuration(
          response.data.processingResult.videoDuration
        );
        const processedDuration = formatDuration(
          response.data.processingResult.processedDuration
        );
        truncatedInfo.value = `Note: This video is ${totalDuration} long. Only the first ${processedDuration} were analyzed.`;
      } else {
        truncatedInfo.value = null;
      }

      snackbar.value = {
        show: true,
        text: "Narrative generated successfully!",
        color: "success",
      };
    } else if (response.data.sessionId) {
      // If we have a session ID but processing is not complete,
      // start polling for status updates
      processingSessionId.value = response.data.sessionId;
      processingStatus.value = "processing";
      processingStatusMessage.value =
        "Video is being processed. This may take a few minutes...";
      startProcessingStatusCheck();
    } else {
      // Use mock data if no processing result is available
      narrative.value =
        response.data.mockResult?.narrative || "No narrative available yet.";
      summary.value =
        response.data.mockResult?.summary || "No summary available yet.";
      timeline.value = processTimelineData(
        response.data.mockResult?.timeline || []
      );
      timestamps.value = response.data.mockResult?.timestamps || [];
      truncatedInfo.value = null;
    }
  } catch (error) {
    console.error("Error processing YouTube video:", error);
    snackbar.value = {
      show: true,
      text: "Failed to process video. Please try again.",
      color: "error",
    };
  } finally {
    loading.value = false;
  }
};

const processUploadedVideo = async () => {
  if (!videoFile.value) return;

  loading.value = true;
  resetProcessingState();

  // Create a URL for the uploaded video file for preview
  if (videoFileUrl.value) {
    URL.revokeObjectURL(videoFileUrl.value);
  }
  videoFileUrl.value = URL.createObjectURL(videoFile.value);
  showPreview.value = true;

  try {
    // Call the API service to upload and process the video
    const response = await api.uploadVideo(videoFile.value);

    // Check if we have a processing result
    if (response.data.processingResult) {
      narrative.value = response.data.processingResult.narrative;
      summary.value = response.data.processingResult.summary;
      timeline.value = processTimelineData(
        response.data.processingResult.timeline
      );
      timestamps.value = response.data.processingResult.timestamps;

      // Check if video was truncated
      if (response.data.processingResult.truncated) {
        const totalDuration = formatDuration(
          response.data.processingResult.videoDuration
        );
        const processedDuration = formatDuration(
          response.data.processingResult.processedDuration
        );
        truncatedInfo.value = `Note: This video is ${totalDuration} long. Only the first ${processedDuration} were analyzed.`;
      } else {
        truncatedInfo.value = null;
      }

      snackbar.value = {
        show: true,
        text: "Video processed successfully!",
        color: "success",
      };
    } else if (response.data.sessionId) {
      // If we have a session ID but processing is not complete,
      // start polling for status updates
      processingSessionId.value = response.data.sessionId;
      processingStatus.value = "processing";
      processingStatusMessage.value =
        "Video is being processed. This may take a few minutes...";
      startProcessingStatusCheck();
    } else {
      // Use mock data if no processing result is available
      narrative.value =
        response.data.mockResult?.narrative || "No narrative available yet.";
      summary.value =
        response.data.mockResult?.summary || "No summary available yet.";
      timeline.value = processTimelineData(
        response.data.mockResult?.timeline || []
      );
      timestamps.value = response.data.mockResult?.timestamps || [];
      truncatedInfo.value = null;
    }
  } catch (error) {
    console.error("Error processing uploaded video:", error);
    snackbar.value = {
      show: true,
      text: "Failed to process video. Please try again.",
      color: "error",
    };
  } finally {
    loading.value = false;
  }
};

// Process timeline data to add transcript information
const processTimelineData = (timelineData) => {
  return timelineData.map((item) => {
    // Create a processed item with audio transcript
    const processedItem = {
      ...item,
      audioTranscript: null,
    };

    // If the item has an audio transcript (from the server)
    if (item.isAudioTranscript && item.transcript) {
      processedItem.audioTranscript = item.transcript;
    }
    // If it's a regular transcript, treat it as audio transcript for backward compatibility
    else if (item.transcript) {
      processedItem.audioTranscript = item.transcript;
    }

    return processedItem;
  });
};

const resetProcessingState = () => {
  // Clear any existing processing state
  processingStatus.value = null;
  processingStatusMessage.value = "";
  processingSessionId.value = null;
  narrative.value = "";
  summary.value = "";
  timeline.value = [];
  timestamps.value = [];
  truncatedInfo.value = null;

  // Clear any existing interval
  if (processingCheckInterval) {
    clearInterval(processingCheckInterval);
    processingCheckInterval = null;
  }
};

const startProcessingStatusCheck = () => {
  // Check status every 5 seconds
  processingCheckInterval = setInterval(checkProcessingStatus, 5000);
};

const checkProcessingStatus = async () => {
  if (!processingSessionId.value) {
    stopProcessingStatusCheck();
    return;
  }

  try {
    const response = await api.getProcessingStatus(processingSessionId.value);

    if (response.data.status === "completed") {
      // Processing is complete
      processingStatus.value = "completed";
      processingStatusMessage.value = "Video processing complete!";

      // Update narrative, summary, timeline and timestamps
      const result = response.data.result;
      narrative.value = result.narrative;
      summary.value = result.summary;
      timeline.value = processTimelineData(result.timeline);
      timestamps.value = result.timestamps;

      // Check if video was truncated
      if (result.truncated) {
        const totalDuration = formatDuration(result.videoDuration);
        const processedDuration = formatDuration(result.processedDuration);
        truncatedInfo.value = `Note: This video is ${totalDuration} long. Only the first ${processedDuration} were analyzed.`;
      } else {
        truncatedInfo.value = null;
      }

      // Stop checking
      stopProcessingStatusCheck();

      snackbar.value = {
        show: true,
        text: "Narrative generated successfully!",
        color: "success",
      };
    } else if (response.data.status === "processing") {
      // Still processing
      processingStatus.value = "processing";
      processingStatusMessage.value = "Video is still being processed...";
    } else {
      // Error or not found
      processingStatus.value = null;
      stopProcessingStatusCheck();

      snackbar.value = {
        show: true,
        text: "Processing session not found or error occurred.",
        color: "error",
      };
    }
  } catch (error) {
    console.error("Error checking processing status:", error);
    stopProcessingStatusCheck();

    snackbar.value = {
      show: true,
      text: "Failed to check processing status.",
      color: "error",
    };
  }
};

const stopProcessingStatusCheck = () => {
  if (processingCheckInterval) {
    clearInterval(processingCheckInterval);
    processingCheckInterval = null;
  }
};

const copyNarrative = () => {
  navigator.clipboard
    .writeText(narrative.value)
    .then(() => {
      snackbar.value = {
        show: true,
        text: "Narrative copied to clipboard!",
        color: "success",
      };
    })
    .catch(() => {
      snackbar.value = {
        show: true,
        text: "Failed to copy to clipboard",
        color: "error",
      };
    });
};

const copyTimeline = () => {
  const timelineText = timeline.value
    .map((item) => {
      let text = `${item.timestampDisplay || item.timestamp}: ${
        item.description
      }`;

      if (item.audioTranscript) {
        text += `\nAudio Transcript: "${item.audioTranscript}"`;
      }

      return text;
    })
    .join("\n\n");

  navigator.clipboard
    .writeText(timelineText)
    .then(() => {
      snackbar.value = {
        show: true,
        text: "Timeline copied to clipboard!",
        color: "success",
      };
    })
    .catch(() => {
      snackbar.value = {
        show: true,
        text: "Failed to copy to clipboard",
        color: "error",
      };
    });
};

const seekToTimestamp = (time) => {
  // Handle timestamp ranges (e.g., "00:01:00 - 00:01:05")
  let startTime = time;
  if (time.includes(" - ")) {
    startTime = time.split(" - ")[0];
  }

  // Parse the timestamp (HH:MM:SS format)
  const [hours, minutes, seconds] = startTime.split(":").map(Number);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  // For YouTube embeds
  if (embedUrl.value) {
    // We would need to use the YouTube Player API
    // For now, just show a message
    snackbar.value = {
      show: true,
      text: `Seeking to ${startTime} in YouTube video`,
      color: "info",
    };
  }
  // For uploaded videos
  else if (videoFileUrl.value && videoPlayer.value) {
    videoPlayer.value.currentTime = totalSeconds;
    videoPlayer.value.play();
  }
};

const getTimelineColor = (index, item) => {
  // Return different colors for timeline items
  // Use success color for items with audio transcripts
  if (item && item.audioTranscript) {
    return "success";
  }

  // Otherwise use rotating colors
  const colors = ["primary", "secondary", "info", "warning"];
  return colors[index % colors.length];
};

const checkServerHealth = async () => {
  try {
    const response = await api.checkHealth();
    snackbar.value = {
      show: true,
      text: "Server is running properly",
      color: "success",
    };
  } catch (error) {
    snackbar.value = {
      show: true,
      text: "Server is not responding. Please check the backend.",
      color: "error",
    };
  }
};

// Lifecycle hooks
onMounted(() => {
  checkOpenAiConfig();
});

onBeforeUnmount(() => {
  stopProcessingStatusCheck();
  if (videoFileUrl.value) {
    URL.revokeObjectURL(videoFileUrl.value);
  }
});
</script>

<style>
.video-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
  margin-bottom: 16px;
}

.video-iframe,
.video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.narrative-text,
.summary-text {
  line-height: 1.6;
  font-size: 1.1rem;
  white-space: pre-line;
}

.timeline-item-content {
  padding: 8px 0;
}

.timestamp-chip {
  cursor: pointer;
  margin-right: 8px;
}

.transcript-container {
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
}

.audio-transcript {
  background-color: rgba(76, 175, 80, 0.05);
}

.transcript-text {
  font-style: italic;
  color: #666;
  margin: 4px 0 0 0;
  font-size: 0.9rem;
  line-height: 1.4;
}
</style>
