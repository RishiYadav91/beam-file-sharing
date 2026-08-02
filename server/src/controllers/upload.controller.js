/**
 * controllers/upload.controller.js
 * ---------------------------------
 * Handles file/folder upload requests at POST /api/upload.
 * Accepts one or many files (folders arrive as many files whose
 * names include their relative path — see uploadService.js on the
 * frontend), saves each individually via the existing per-file
 * metadata store, then groups them under one shareable transferId.
 */

const fs = require("fs").promises;
const { saveFileMetadata, saveTransfer } = require("../services/file.service");
const { buildDownloadUrl } = require("../utils/network");

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

    // 2. Validate file presence (multer .array() populates req.files)
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded. Please attach at least one file under the 'files' field",
      });
    }

    // 3. Reject empty files (0 bytes) — clean up anything already
    // written to disk before responding, same as the single-file path.
    const emptyFiles = files.filter((f) => f.size === 0);
    if (emptyFiles.length > 0) {
      await Promise.all(
        files.map((f) => fs.unlink(f.path).catch(() => {}))
      );
      return res.status(400).json({
        success: false,
        message: `One or more uploaded files are empty (0 bytes): ${emptyFiles
          .map((f) => f.originalname)
          .join(", ")}`,
      });
    }

    // 4. Save metadata for every file (existing per-file store, unchanged).
    // Folder uploads send a parallel "paths" field — one string per
    // file, same order as "files" — since busboy strips any "/" out
    // of the filename field itself. A single repeated field comes
    // through as a bare string rather than a 1-item array, so that
    // needs normalizing first.
    const rawPaths = req.body.paths;
    const relativePaths = rawPaths === undefined ? [] : [].concat(rawPaths);

    const metadataList = files.map((file, i) => saveFileMetadata(file, relativePaths[i]));

    // 5. Group them under one transfer
    const transfer = saveTransfer(metadataList);

    // 6. Construct LAN download URL via existing utility builder
    const protocol = req.protocol || "http";
    const downloadUrl = buildDownloadUrl(transfer.transferId, protocol);

    // 7. Return HTTP 201 response per Milestone 9 spec
    return res.status(201).json({
      success: true,
      transferId: transfer.transferId,
      totalFiles: transfer.totalFiles,
      totalSize: transfer.totalSize,
      expiresAt: transfer.expiryTimestamp,
      downloadUrl,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadFile };
