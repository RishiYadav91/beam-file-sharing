/**
 * services/socket.service.js
 * ----------------------------
 * Owns the single Socket.IO server instance and is the ONLY file in
 * the backend that touches `io` directly. Every other file (route
 * handlers, controllers) that needs to notify a client goes through
 * the helper functions exported here, never through `io` itself.
 *
 * Transfer model:
 *  - Each fileId is treated as its own Socket.IO "room" containing
 *    exactly one member: the uploader's browser socket. This isn't
 *    multi-user chat — it's just the simplest way to scope a status
 *    event to "whoever uploaded this specific file", since Socket.IO
 *    rooms already do that addressing for free.
 *  - The uploader's browser joins that room by emitting a `join`
 *    event with `{ fileId }` once it has a fileId (i.e. right after
 *    a successful upload — see src/services/socketService.js on the
 *    frontend).
 *  - The download controller (a plain HTTP request, not a socket)
 *    calls the notify* helpers below at the relevant points in the
 *    download lifecycle; this module fans those out to whichever
 *    room matches that fileId.
 */

const { Server } = require("socket.io");
const { CLIENT_URL } = require("../config/env");

const EVENTS = {
  RECEIVER_CONNECTED: "transfer:receiver_connected",
  DOWNLOAD_STARTED: "transfer:download_started",
  DOWNLOAD_PROGRESS: "transfer:download_progress",
  DOWNLOAD_COMPLETED: "transfer:download_completed",
  RECEIVER_DISCONNECTED: "transfer:receiver_disconnected",
};

let io = null;

/**
 * Attaches Socket.IO to the existing HTTP server (the one returned
 * by app.listen() in server.js). Does NOT create a second server —
 * Socket.IO listens for the 'upgrade' event on this same server.
 * @param {import("http").Server} httpServer
 */
function initSocketService(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: CLIENT_URL,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    // Uploader's browser announces which transfer it wants status
    // updates for. Only the uploader ever calls this — receivers
    // never open a socket connection at all, they just hit the
    // plain HTTP download URL.
    socket.on("join", ({ fileId } = {}) => {
      if (typeof fileId !== "string" || !fileId) return;
      socket.join(fileId);
      console.log(`[socket] ${socket.id} joined room ${fileId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Emits a status event to whichever uploader socket is in the room
 * for this fileId. No-op if Socket.IO hasn't been initialized yet
 * or if nobody is currently in that room (e.g. tab already closed).
 */
function emitToUploader(fileId, event, extra = {}) {
  if (!io || !fileId) return;
  io.to(fileId).emit(event, { fileId, timestamp: new Date().toISOString(), ...extra });
}

function notifyReceiverConnected(fileId) {
  emitToUploader(fileId, EVENTS.RECEIVER_CONNECTED);
}

function notifyDownloadStarted(fileId) {
  emitToUploader(fileId, EVENTS.DOWNLOAD_STARTED);
}

function notifyDownloadProgress(fileId, percent) {
  emitToUploader(fileId, EVENTS.DOWNLOAD_PROGRESS, { percent });
}

function notifyDownloadCompleted(fileId) {
  emitToUploader(fileId, EVENTS.DOWNLOAD_COMPLETED);
}

function notifyReceiverDisconnected(fileId) {
  emitToUploader(fileId, EVENTS.RECEIVER_DISCONNECTED);
}

module.exports = {
  initSocketService,
  notifyReceiverConnected,
  notifyDownloadStarted,
  notifyDownloadProgress,
  notifyDownloadCompleted,
  notifyReceiverDisconnected,
};
