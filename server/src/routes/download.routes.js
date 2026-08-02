/**
 * routes/download.routes.js
 * -------------------------
 * Defines GET /api/download/:transferId endpoint.
 */

const express = require("express");
const { downloadFile } = require("../controllers/download.controller");

const router = express.Router();

router.get("/download/:transferId", downloadFile);

module.exports = router;
