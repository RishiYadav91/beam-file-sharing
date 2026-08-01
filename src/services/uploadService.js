/**
 * services/uploadService.js
 * -------------------------
 * API service for communicating with the backend upload endpoints.
 * Separates networking logic cleanly from UI components.
 */

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

/**
 * Uploads a file to the backend API with real-time progress updates.
 *
 * @param {File} file - The file object to upload.
 * @param {Function} onProgress - Callback function receiving progress percentage (0-100).
 * @param {AbortSignal} [signal] - Optional AbortController signal for cancellation.
 * @returns {Promise<Object>} Backend response JSON payload containing fileId, filename, size, expiresAt, downloadUrl.
 */
export async function uploadFile(file, onProgress, signal) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isCancel(error)) {
      const cancelError = new Error("Upload was cancelled.");
      cancelError.isCancelled = true;
      throw cancelError;
    }

    if (error.response) {
      // Backend returned an error response (e.g. 400 Bad Request, 413 File Too Large)
      const message = error.response.data?.message || "Upload failed due to a server error.";
      throw new Error(message);
    } else if (error.request) {
      // Request was made but no response received (Backend offline or network error)
      throw new Error("Unable to connect to backend server. Please verify the server is running at http://localhost:8000.");
    } else {
      // Something else triggered the error
      throw new Error(error.message || "An unexpected error occurred during upload.");
    }
  }
}
