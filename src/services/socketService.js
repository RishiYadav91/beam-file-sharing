/**
 * services/socketService.js
 * ---------------------------
 * Thin wrapper around socket.io-client. Mirrors uploadService.js:
 * this is the only file that imports socket.io-client directly, so
 * components never talk to the socket library itself.
 *
 * A single shared socket instance is reused for the lifetime of the
 * tab, created lazily on first use. It's reference-counted rather
 * than owned by any one feature: transfer status (post-upload) and
 * device discovery (visible even before an upload) both need it
 * independently, and neither should be able to disconnect it out
 * from under the other. Reconnection is left on socket.io's default
 * behavior, which retries automatically with backoff.
 */

import { io } from "socket.io-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
// Socket.IO attaches to the server root, not the /api namespace.
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

let socket = null;
let activeUsers = 0;

/**
 * Returns the shared socket, creating and connecting it on first call.
 * Does not affect the reference count — use acquireSocket() instead
 * when a hook/component wants to be counted as a user of it.
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
 * Like getSocket(), but registers the caller as an active user —
 * pair with releaseSocket() in a cleanup function. Use this from any
 * hook/component that wants the connection kept alive for as long as
 * it's mounted, without assuming it's the only such consumer.
 * @returns {import("socket.io-client").Socket}
 */
export function acquireSocket() {
  activeUsers += 1;
  return getSocket();
}

/**
 * Releases this caller's claim on the shared socket. Only actually
 * disconnects once every consumer that called acquireSocket() has
 * released it — so, e.g., resetting a finished transfer doesn't
 * disconnect the socket while a Nearby Devices panel is still using it.
 */
export function releaseSocket() {
  activeUsers = Math.max(0, activeUsers - 1);
  if (activeUsers === 0 && socket) {
    socket.disconnect();
  }
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
 * Force-disconnects the shared socket regardless of active users.
 * Rarely needed directly — prefer acquireSocket()/releaseSocket() so
 * independent consumers can't disconnect the socket out from under
 * each other. Kept for explicit full-teardown cases.
 */
export function disconnectSocket() {
  activeUsers = 0;
  if (socket) {
    socket.disconnect();
  }
}
