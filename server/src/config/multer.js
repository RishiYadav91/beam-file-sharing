/**
 * config/multer.js
 * ----------------
 * Pre-configured Multer disk storage engine.
 *
 * IMPORTANT: this module is NOT attached to any route yet. Upload
 * handling is intentionally out of scope for this pass — this file
 * only sets up *how* a file would be stored (destination + filename
 * strategy) so the upload route can simply `require` and use it
 * once that feature is built, without revisiting storage config.
 *
 * - destination: files go into UPLOAD_DIR (see config/env.js).
 * - filename: each file is renamed to a UUID + its original
 *   extension, avoiding collisions and not trusting user-supplied
 *   filenames on disk.
 */

const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { UPLOAD_DIR, MAX_FILE_SIZE_MB } = require("./env");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "..", UPLOAD_DIR));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

module.exports = upload;
