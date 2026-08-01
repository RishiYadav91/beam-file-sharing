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
 * - expiryTimestamp (24 hours after upload)
 */

const { v4: uuidv4 } = require("uuid");
const { FILE_EXPIRY_HOURS } = require("../config/env");

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
 * Retrieve file metadata by ID (for future use / verification).
 * @param {string} fileId
 * @returns {Object|null}
 */
function getFileMetadata(fileId) {
  return fileMap.get(fileId) || null;
}

module.exports = {
  saveFileMetadata,
  getFileMetadata,
};
