/**
 * services/socketService.js
 * ---------------------------
 * Thin wrapper around socket.io-client. Mirrors uploadService.js:
 * this is the only file that imports socket.io-client directly, so
 * components never talk to the socket library itself.
 *
 * A single shared socket instance is reused for the lifetime of the
 * tab (created lazily on first use, i.e. right after a successful
 * upload — never on app load). Reconnection is left on socket.io's
 * default behavior, which retries automatically with backoff.
 */

import { io } from "socket.io-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
// Socket.IO attaches to the server root, not the /api namespace.
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

let socket = null;

/**
 * Returns the shared socket, creating and connecting it on first call.
 * @returns {import("socket.io-client").Socket}
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      // Defaults already enable reconnection; kept explicit for clarity.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

/**
 * Returns the shared socket if one has already been created, without
 * creating or connecting one. Used to read initial connection state
 * (e.g. for a "connected" indicator) without side effects.
 * @returns {import("socket.io-client").Socket|null}
 */
export function peekSocket() {
  return socket;
}

/**
 * Tells the backend which transfer this browser is the uploader for,
 * so status events for that fileId get routed back to it.
 * @param {string} fileId
 */
export function joinTransfer(fileId) {
  if (!fileId) return;
  const s = getSocket();
  if (s.connected) {
    s.emit("join", { fileId });
  } else {
    // Socket.IO buffers emits made before 'connect' fires by default,
    // but joining explicitly on (re)connect guards against the edge
    // case of a reconnect happening after a drop.
    s.once("connect", () => s.emit("join", { fileId }));
  }
}

/**
 * Disconnects the shared socket entirely. Called when the result
 * panel unmounts (reset / send another file) — each transfer gets a
 * clean connection rather than accumulating stale room memberships.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}
