/**
 * controllers/download.controller.js
 * -----------------------------------
 * Handles file download requests at GET /api/download/:fileId.
 */

const fs = require("fs");
const {
  getFileMetadata,
  isFileExpired,
  getSecureFilePath,
} = require("../services/file.service");

function downloadFile(req, res, next) {
  try {
    const { fileId } = req.params;

    // 1. Retrieve metadata
    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID",
      });
    }

    const metadata = getFileMetadata(fileId);
    if (!metadata) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // 2. Expiry check (HTTP 410 Gone)
    if (isFileExpired(metadata)) {
      return res.status(410).json({
        success: false,
        message: "File has expired.",
      });
    }

    // 3. Resolve secure physical file path (prevents path traversal)
    const filePath = getSecureFilePath(metadata.storedFilename);
    if (!filePath) {
      return res.status(403).json({
        success: false,
        message: "Invalid file path",
      });
    }

    // 4. Verify physical file exists on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File missing from disk",
      });
    }

    // 5. Serve file download using original filename
    return res.download(filePath, metadata.originalFilename, (err) => {
      if (err && !res.headersSent) {
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { downloadFile };
