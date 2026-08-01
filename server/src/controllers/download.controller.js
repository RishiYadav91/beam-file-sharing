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
const {
  notifyReceiverConnected,
  notifyDownloadStarted,
  notifyDownloadProgress,
  notifyDownloadCompleted,
  notifyReceiverDisconnected,
} = require("../services/socket.service");

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

    // A real receiver device has opened a valid download link.
    notifyReceiverConnected(fileId);

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

    // 5. Serve file download using original filename.
    // Streamed manually (rather than res.download()) so we can track
    // bytes-sent against the known file size and emit live progress.
    res.setHeader("Content-Length", metadata.size);
    res.attachment(metadata.originalFilename); // sets Content-Disposition + Content-Type

    notifyDownloadStarted(fileId);

    let bytesSent = 0;
    let lastPercent = -1;
    const readStream = fs.createReadStream(filePath);

    readStream.on("data", (chunk) => {
      bytesSent += chunk.length;
      const percent =
        metadata.size > 0 ? Math.min(100, Math.floor((bytesSent / metadata.size) * 100)) : 100;
      if (percent !== lastPercent) {
        lastPercent = percent;
        notifyDownloadProgress(fileId, percent);
      }
    });

    readStream.on("error", (err) => {
      if (!res.headersSent) next(err);
      // If headers were already sent, the 'close' handler below
      // covers notifying the uploader of the dropped connection.
    });

    // Fires only when the full response was successfully flushed —
    // the reliable signal for "the receiver actually got the file".
    res.on("finish", () => {
      notifyDownloadCompleted(fileId);
    });

    // Fires whenever the connection closes, whether that's after a
    // normal finish or because the receiver disconnected mid-stream.
    // Checking writableEnded distinguishes the two so completion and
    // disconnect are never both reported for the same transfer.
    res.on("close", () => {
      if (!res.writableEnded) {
        notifyReceiverDisconnected(fileId);
      }
    });

    return readStream.pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = { downloadFile };
