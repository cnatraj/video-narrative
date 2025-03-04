import axios from "axios";

// Read API URL from environment variables, with fallback
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

console.log("Using API URL:", API_URL);

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 300000, // 5 minute timeout for long-running operations
  withCredentials: false, // Important for CORS requests
});

// Add request interceptor for debugging in development
if (import.meta.env.DEV) {
  apiClient.interceptors.request.use((request) => {
    console.log("API Request:", request.method, request.url);
    return request;
  });
}

export const api = {
  /**
   * Process a YouTube video URL
   * @param {string} youtubeUrl - The YouTube video URL to process
   * @returns {Promise} - The response from the API
   */
  processYouTubeUrl(youtubeUrl) {
    return apiClient.post("/process-youtube", { youtubeUrl });
  },

  /**
   * Upload a video file for processing
   * @param {File} videoFile - The video file to upload
   * @returns {Promise} - The response from the API
   */
  uploadVideo(videoFile) {
    const formData = new FormData();
    formData.append("video", videoFile);

    return apiClient.post("/upload-video", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * Check the processing status of a video
   * @param {string} sessionId - The session ID of the processing job
   * @returns {Promise} - The response from the API
   */
  getProcessingStatus(sessionId) {
    return apiClient.get(`/processing-status/${sessionId}`);
  },

  /**
   * Check the health status of the API
   * @returns {Promise} - The response from the API
   */
  checkHealth() {
    return apiClient.get("/health");
  },
};
