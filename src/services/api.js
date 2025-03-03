import axios from "axios";

// Read API URL from environment variables, with fallback
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export const api = {
  /**
   * Process a YouTube video URL
   * @param {string} youtubeUrl - The YouTube video URL to process
   * @returns {Promise} - The response from the API
   */
  processYouTubeUrl(youtubeUrl) {
    return axios.post(`${API_URL}/process-youtube`, { youtubeUrl });
  },

  /**
   * Upload a video file for processing
   * @param {File} videoFile - The video file to upload
   * @returns {Promise} - The response from the API
   */
  uploadVideo(videoFile) {
    const formData = new FormData();
    formData.append("video", videoFile);

    return axios.post(`${API_URL}/upload-video`, formData, {
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
    return axios.get(`${API_URL}/processing-status/${sessionId}`);
  },

  /**
   * Check the health status of the API
   * @returns {Promise} - The response from the API
   */
  checkHealth() {
    return axios.get(`${API_URL}/health`);
  },
};
