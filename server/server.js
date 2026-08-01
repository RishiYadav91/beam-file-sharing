/**
 * server.js
 * ---------
 * The single entry point for starting the process.
 *
 * Kept deliberately thin: all Express wiring (middleware, routes,
 * error handlers) lives in src/app.js. This file's only job is to
 * load environment variables, pull in the configured app, and bind
 * it to a port. Separating "build the app" from "run the app" makes
 * the app importable/testable (e.g. with supertest) without opening
 * a real network port.
 */

require("dotenv").config();

const app = require("./src/app");
const { PORT, NODE_ENV } = require("./src/config/env");
const { startCleanupService } = require("./src/services/cleanup.service");

const server = app.listen(PORT, () => {
  console.log(`[server] running in ${NODE_ENV} mode on port ${PORT}`);
  startCleanupService();
});

// Fail loudly instead of leaving the process in a half-alive state.
process.on("unhandledRejection", (err) => {
  console.error("[server] unhandled rejection:", err);
  server.close(() => process.exit(1));
});
