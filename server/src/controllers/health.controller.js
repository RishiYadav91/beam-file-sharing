/**
 * controllers/health.controller.js
 * ---------------------------------
 * Handler logic for the health check endpoint.
 *
 * Kept separate from the route definition so the route file only
 * describes "what URL maps to what handler," while this file holds
 * the actual behavior. Trivial today, but this is the pattern every
 * future controller (upload, download, etc.) will follow.
 */

const { NODE_ENV } = require("../config/env");

function getHealth(req, res) {
  res.status(200).json({
    status: "ok",
    environment: NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };
