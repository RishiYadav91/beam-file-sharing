/**
 * controllers/download.controller.js
 * -----------------------------------
 * Handles download requests at GET /api/download/:transferId.
 *
 * A transfer with exactly one file streams that file directly, same
 * as before Milestone 9. A transfer with multiple files streams a
 * ZIP built on the fly via zip.service.js. Either way, the same four
 * Socket.IO notifications fire at the same lifecycle points, keyed
 * by transferId instead of the old single fileId.
 */

const fs = require("fs");
const {
  getTransfer,
  getTransferFiles,
  getSecureFilePath,
} = require("../services/file.service");
const { streamZip } = require("../services/zip.service");
const {
  notifyReceiverConnected,
  notifyDownloadStarted,
  notifyDownloadProgress,
  notifyDownloadCompleted,
  notifyReceiverDisconnected,
} = require("../services/socket.service");

/**
 * Keeps a (possibly folder-relative, e.g. "photos/trip/img.jpg") name
 * safe to use as a ZIP entry: forward slashes only, no ".." segments.
 */
function sanitizeEntryName(name) {
  const cleaned = String(name)
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== "..")
    .join("/");
  return cleaned || "file";
}

function downloadFile(req, res, next) {
  try {
    const { transferId } = req.params;

    if (!transferId) {
      return res.status(400).json({ success: false, message: "Invalid transfer ID" });
    }

    const transfer = getTransfer(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, message: "Transfer not found" });
    }

    // A real receiver device has opened a valid download link.
    notifyReceiverConnected(transferId);

    // Resolves to null if the transfer, or any file within it, has expired.
    const files = getTransferFiles(transferId);
    if (!files) {
      return res.status(410).json({ success: false, message: "Transfer has expired." });
    }

    // Resolve + verify every physical path up front, before headers go out.
    const resolved = [];
    for (const file of files) {
      const filePath = getSecureFilePath(file.storedFilename);
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "File missing from disk" });
      }
      resolved.push({
        absolutePath: filePath,
        entryName: sanitizeEntryName(file.relativePath),
        size: file.size,
      });
    }

    notifyDownloadStarted(transferId);

    if (resolved.length === 1) {
      return streamSingleFile(res, resolved[0], transferId, next);
    }

    return streamZipArchive(res, resolved, transfer, transferId, next);
  } catch (err) {
    return next(err);
  }
}

/** Same manual stream-with-progress approach used since Milestone 8. */
function streamSingleFile(res, file, transferId, next) {
  res.setHeader("Content-Length", file.size);
  res.attachment(file.entryName.split("/").pop());

  let bytesSent = 0;
  let lastPercent = -1;
  const readStream = fs.createReadStream(file.absolutePath);

  readStream.on("data", (chunk) => {
    bytesSent += chunk.length;
    const percent = file.size > 0 ? Math.min(100, Math.floor((bytesSent / file.size) * 100)) : 100;
    if (percent !== lastPercent) {
      lastPercent = percent;
      notifyDownloadProgress(transferId, percent);
    }
  });

  readStream.on("error", (err) => {
    if (!res.headersSent) next(err);
  });

  res.on("finish", () => notifyDownloadCompleted(transferId));
  res.on("close", () => {
    if (!res.writableEnded) notifyReceiverDisconnected(transferId);
  });

  return readStream.pipe(res);
}

/** Multi-file case: stream a ZIP built on the fly via zip.service.js. */
function streamZipArchive(res, files, transfer, transferId, next) {
  const zipName = `beam-transfer-${transferId.slice(0, 8)}.zip`;
  res.attachment(zipName);

  res.on("finish", () => notifyDownloadCompleted(transferId));
  res.on("close", () => {
    if (!res.writableEnded) notifyReceiverDisconnected(transferId);
  });

  streamZip(res, files, {
    totalSize: transfer.totalSize,
    onProgress: (percent) => notifyDownloadProgress(transferId, percent),
  }).catch((err) => {
    if (!res.headersSent) next(err);
  });
}

module.exports = { downloadFile };
