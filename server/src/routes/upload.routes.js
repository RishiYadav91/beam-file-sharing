/**
 * routes/upload.routes.js
 * -----------------------
 * Defines POST /api/upload endpoint for single file uploads.
 */

const express = require("express");
const upload = require("../config/multer");
const { uploadFile } = require("../controllers/upload.controller");

const router = express.Router();

router.post("/upload", upload.single("file"), uploadFile);

module.exports = router;
