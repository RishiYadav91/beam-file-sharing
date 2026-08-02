/**
 * services/file.service.js
 * ------------------------
 * In-memory storage service for file metadata.
 *
 * Stores upload records in an in-memory Map. Each record holds:
 * - fileId (UUID v4)
 * - originalFilename
 * - storedFilename
 * - size (bytes)
 * - mimetype
 * - uploadTimestamp
 * - expiryTimestamp (configurable via FILE_EXPIRY_HOURS)
 */

const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { FILE_EXPIRY_HOURS, UPLOAD_DIR } = require("../config/env");

const MS_PER_HOUR = 60 * 60 * 1000;

// In-memory file metadata store
const fileMap = new Map();

/**
 * Save file metadata to in-memory store.
 * @param {Object} file - Express/Multer file object
 * @param {string} [relativePath] - Folder-relative path (e.g. from a
 *   webkitdirectory selection), sent separately from the file itself
 *   because multer/busboy always strips any "/" out of file.originalname
 *   for security — the raw filename field can never carry a path.
 * @returns {Object} Stored file record metadata
 */
function saveFileMetadata(file, relativePath) {
  const fileId = uuidv4();
  const now = new Date();
  const uploadTimestamp = now.toISOString();
  const expiryTimestamp = new Date(now.getTime() + FILE_EXPIRY_HOURS * MS_PER_HOUR).toISOString();

  const metadata = {
    fileId,
    originalFilename: file.originalname,
    // Falls back to the plain filename for non-folder uploads, where
    // there's no folder structure to preserve.
    relativePath: relativePath || file.originalname,
    storedFilename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    uploadTimestamp,
    expiryTimestamp,
  };

  fileMap.set(fileId, metadata);
  return metadata;
}

/**
 * Retrieve file metadata by ID.
 * @param {string} fileId
 * @returns {Object|null}
 */
function getFileMetadata(fileId) {
  return fileMap.get(fileId) || null;
}

/**
 * Check if file metadata has passed its expiration time.
 * @param {Object} metadata
 * @returns {boolean}
 */
function isFileExpired(metadata) {
  if (!metadata || !metadata.expiryTimestamp) return true;
  return new Date() > new Date(metadata.expiryTimestamp);
}

/**
 * Resolves physical file path and verifies no path traversal occurred.
 * @param {string} storedFilename
 * @returns {string|null} Resolved absolute path or null if invalid
 */
function getSecureFilePath(storedFilename) {
  if (!storedFilename) return null;
  const uploadDirResolved = path.resolve(__dirname, "..", "..", UPLOAD_DIR);
  const targetPath = path.resolve(uploadDirResolved, storedFilename);

  // Security check: ensure path resides strictly within UPLOAD_DIR
  if (!targetPath.startsWith(uploadDirResolved)) {
    return null;
  }
  return targetPath;
}

/**
 * Retrieve all file metadata records in memory.
 * @returns {Array<Object>}
 */
function getAllFileMetadata() {
  return Array.from(fileMap.values());
}

/**
 * Remove file metadata record by ID from memory.
 * @param {string} fileId
 * @returns {boolean}
 */
function removeFileMetadata(fileId) {
  return fileMap.delete(fileId);
}

// In-memory transfer index (Milestone 9)
const transferMap = new Map();

/**
 * Groups a set of already-saved file metadata records under one
 * shareable transferId. Each file keeps its own row in `fileMap`
 * (created via saveFileMetadata, unchanged above) — this is just an
 * index on top, so cleanup's expiry sweep (which only knows about
 * individual file records) needs no changes at all: as each file in
 * a transfer expires and gets deleted, the transfer degrades
 * gracefully rather than needing its own cleanup path.
 * @param {Array<Object>} fileMetadataList - records returned by saveFileMetadata
 * @returns {Object} { transferId, fileIds, totalFiles, totalSize, expiryTimestamp }
 */
function saveTransfer(fileMetadataList) {
  const transferId = uuidv4();
  const totalSize = fileMetadataList.reduce((sum, f) => sum + f.size, 0);
  // All files in one request are created together, so they already
  // share the same expiry window — reuse it rather than recomputing.
  const { uploadTimestamp, expiryTimestamp } = fileMetadataList[0];

  const transfer = {
    transferId,
    fileIds: fileMetadataList.map((f) => f.fileId),
    totalFiles: fileMetadataList.length,
    totalSize,
    uploadTimestamp,
    expiryTimestamp,
  };

  transferMap.set(transferId, transfer);
  return transfer;
}

/**
 * Retrieve a transfer's index record (not the files themselves).
 * @param {string} transferId
 * @returns {Object|null}
 */
function getTransfer(transferId) {
  return transferMap.get(transferId) || null;
}

/**
 * Resolves a transfer to its still-present, still-valid constituent
 * file metadata records. Returns null if the transfer is unknown, or
 * if ANY constituent file is missing/expired — a partial transfer
 * isn't safely downloadable (a ZIP missing an entry, or a lone file
 * that's already gone).
 * @param {string} transferId
 * @returns {Array<Object>|null}
 */
function getTransferFiles(transferId) {
  const transfer = getTransfer(transferId);
  if (!transfer) return null;

  const files = transfer.fileIds.map((fileId) => getFileMetadata(fileId));
  if (files.some((f) => !f || isFileExpired(f))) return null;

  return files;
}

module.exports = {
  saveFileMetadata,
  getFileMetadata,
  getAllFileMetadata,
  removeFileMetadata,
  isFileExpired,
  getSecureFilePath,
  saveTransfer,
  getTransfer,
  getTransferFiles,
};
