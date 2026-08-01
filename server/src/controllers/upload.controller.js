/**
 * controllers/upload.controller.js
 * ---------------------------------
 * Handles file upload requests at POST /api/upload.
 */

const fs = require("fs").promises;
const { PORT } = require("../config/env");
const { saveFileMetadata } = require("../services/file.service");

const MULTIPART_HEADER = "multipart/form-data";

async function uploadFile(req, res, next) {
  try {
    // 1. Validate content-type header for multipart request
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes(MULTIPART_HEADER)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported request format. Expected multipart/form-data",
      });
    }

    // 2. Validate file presence
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please attach a file under the 'file' field",
      });
    }

    // 3. Handle empty file upload (0 bytes) using asynchronous file deletion
    if (req.file.size === 0) {
      if (req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkErr) {
          // Ignore error if file was already removed
        }
      }
      return res.status(400).json({
        success: false,
        message: "Uploaded file is empty (0 bytes)",
      });
    }

    // 4. Save metadata to in-memory store
    const metadata = saveFileMetadata(req.file);

    // 5. Construct download URL
    const host = req.get("host") || `localhost:${PORT}`;
    const protocol = req.protocol || "http";
    const downloadUrl = `${protocol}://${host}/api/download/${metadata.fileId}`;

    // 6. Return HTTP 201 response per specification
    return res.status(201).json({
      success: true,
      fileId: metadata.fileId,
      filename: metadata.originalFilename,
      size: metadata.size,
      expiresAt: metadata.expiryTimestamp,
      downloadUrl,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadFile };
