/**
 * routes/health.routes.js
 * ------------------------
 * Defines GET /api/health (mounted under /api by routes/index.js).
 *
 * Used by uptime monitors, load balancers, or `docker healthcheck`
 * to confirm the process is alive and responding.
 */

const express = require("express");
const { getHealth } = require("../controllers/health.controller");

const router = express.Router();

router.get("/health", getHealth);

module.exports = router;
