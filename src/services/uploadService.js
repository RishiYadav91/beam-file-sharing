/**
 * services/uploadService.js
 * -------------------------
 * API service for communicating with the backend upload endpoint.
 * Separates networking logic cleanly from UI components.
 */

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

/**
 * Uploads one or more files (or an entire folder's worth of files)
 * to the backend, reporting combined progress across all of them.
 *
 * Folder selections carry a `webkitRelativePath` (e.g.
 * "myFolder/photos/img.jpg") on each File. That can't be smuggled
 * through the filename itself — multer/busboy always strips any "/"
 * out of the filename field server-side for security — so it's sent
 * as a separate parallel "paths" field instead, one entry per file in
 * the same order, which the backend zips back together by index.
 *
 * @param {File[]|FileList} files - Files to upload.
 * @param {Function} onProgress - Callback receiving combined progress percentage (0-100).
 * @param {AbortSignal} [signal] - Optional AbortController signal for cancellation.
 * @returns {Promise<Object>} Backend response: { transferId, totalFiles, totalSize, expiresAt, downloadUrl }.
 */
export async function uploadFiles(files, onProgress, signal) {
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append("files", file);
    formData.append("paths", file.webkitRelativePath || file.name);
  });

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
      throw new Error(message, { cause: error });
    } else if (error.request) {
      // Request was made but no response received (Backend offline or network error)
      throw new Error("Unable to connect to backend server. Please verify the server is running at http://localhost:8000.", { cause: error });
    } else {
      // Something else triggered the error
      throw new Error(error.message || "An unexpected error occurred during upload.", { cause: error });
    }
  }
}
