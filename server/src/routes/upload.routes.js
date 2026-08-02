/**
 * routes/upload.routes.js
 * -----------------------
 * Defines POST /api/upload. Accepts one or more files under the
 * "files" field, using the same pre-configured multer instance from
 * config/multer.js — only the accept-mode changed (.array instead
 * of .single), storage/limits config is untouched.
 */

const express = require("express");
const upload = require("../config/multer");
const { MAX_FILES_PER_UPLOAD } = require("../config/env");
const { uploadFile } = require("../controllers/upload.controller");

const router = express.Router();

router.post("/upload", upload.array("files", MAX_FILES_PER_UPLOAD), uploadFile);

module.exports = router;
