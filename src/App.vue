<template>
  <v-app>
    <AppHeader />

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
                    <YoutubeInput
                      :loading="loading"
                      @submit="processYouTubeVideo"
                    />
                  </v-window-item>

                  <v-window-item value="upload">
                    <v-form @submit.prevent="processUploadedVideo">
                      <VideoUpload v-model="videoFile" class="mb-4" />

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

            <VideoPreview
              :show="showPreview"
              :embed-url="embedUrl"
              :video-file-url="videoFileUrl"
              ref="videoPreview"
            />

            <VideoSummary :summary="summary" :truncated-info="truncatedInfo" />

            <VideoTimeline :timeline="timeline" @seek="seekToTimestamp" />
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <AppFooter />

    <AppSnackbar v-model="snackbar" />
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { api } from "./services/api";
import AppHeader from "./components/AppHeader.vue";
import AppFooter from "./components/AppFooter.vue";
import AppSnackbar from "./components/AppSnackbar.vue";
import VideoPreview from "./components/VideoPreview.vue";
import VideoSummary from "./components/VideoSummary.vue";
import VideoTimeline from "./components/VideoTimeline.vue";
import VideoUpload from "./components/VideoUpload.vue";
import YoutubeInput from "./components/YoutubeInput.vue";

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
const openAiConfigured = ref(true); // Set to true by default since we're using env variables on the backend
const videoPreview = ref(null);
const truncatedInfo = ref(null);

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
    openAiConfigured.value = response.data.openAiConfigured || true;
  } catch (error) {
    console.error("Error checking OpenAI configuration:", error);
    // Default to true since we're using env variables on the backend
    openAiConfigured.value = true;
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

const processYouTubeVideo = async (url) => {
  youtubeUrl.value = url;

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

const seekToTimestamp = (timestamp) => {
  if (!timestamp) return;

  let seconds = 0;
  if (typeof timestamp === "string") {
    const parts = timestamp.split(":");
    if (parts.length === 2) {
      seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else {
      seconds = parseInt(timestamp);
    }
  } else {
    seconds = timestamp;
  }

  if (embedUrl.value) {
    const iframe = document.querySelector(".video-iframe");
    if (iframe) {
      iframe.contentWindow.postMessage(
        {
          event: "command",
          func: "seekTo",
          args: [seconds],
        },
        "*"
      );
    }
  } else if (videoPreview.value?.videoPlayer) {
    videoPreview.value.videoPlayer.currentTime = seconds;
  }
};

// Lifecycle hooks
onMounted(() => {
  // We don't need to check OpenAI config anymore since we're using env variables
  // checkOpenAiConfig();
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
