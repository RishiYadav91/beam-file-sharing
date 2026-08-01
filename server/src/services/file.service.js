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
 * @returns {Object} Stored file record metadata
 */
function saveFileMetadata(file) {
  const fileId = uuidv4();
  const now = new Date();
  const uploadTimestamp = now.toISOString();
  const expiryTimestamp = new Date(now.getTime() + FILE_EXPIRY_HOURS * MS_PER_HOUR).toISOString();

  const metadata = {
    fileId,
    originalFilename: file.originalname,
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

module.exports = {
  saveFileMetadata,
  getFileMetadata,
  isFileExpired,
  getSecureFilePath,
};
