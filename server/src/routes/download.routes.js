/**
 * routes/download.routes.js
 * -------------------------
 * Defines GET /api/download/:fileId endpoint.
 */

const express = require("express");
const { downloadFile } = require("../controllers/download.controller");

const router = express.Router();

router.get("/download/:fileId", downloadFile);

module.exports = router;
