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
const { initSocketService, broadcastDeviceList } = require("./src/services/socket.service");
const { startDiscoveryService } = require("./src/services/discovery.service");
const { getLocalIPAddress } = require("./src/utils/network");

const server = app.listen(PORT, () => {
  const lanIp = getLocalIPAddress();
  console.log(`[server] running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`[server] Local URL:   http://localhost:${PORT}`);
  console.log(`[server] Network LAN: http://${lanIp}:${PORT}`);
  startCleanupService();
});

// Attach Socket.IO to this same HTTP server instance — no second
// server is created, it just listens for the 'upgrade' event on
// the one app.listen() already returned.
initSocketService(server);

// Start LAN device discovery (UDP broadcast/listen). Its update
// callback is the only link between discovery and Socket.IO — the
// two services never import each other directly.
startDiscoveryService(broadcastDeviceList);

// Fail loudly instead of leaving the process in a half-alive state.
process.on("unhandledRejection", (err) => {
  console.error("[server] unhandled rejection:", err);
  server.close(() => process.exit(1));
});
