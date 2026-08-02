/**
 * services/discovery.service.js
 * -------------------------------
 * LAN device discovery over raw UDP broadcast — Node's built-in
 * `dgram` module only, no mDNS/Bonjour/Bluetooth/WebRTC.
 *
 * Fully decoupled from Express and Socket.IO: this module doesn't
 * import either. It just maintains an in-memory registry and, when
 * given an `onUpdate` callback (see server.js), invokes it with the
 * current device list whenever that list changes. Wiring that list
 * onto the frontend is server.js's job, via socket.service.js's
 * broadcastDeviceList() — kept separate on purpose, so this file
 * doesn't need to know Socket.IO (or any transport) exists.
 *
 * Protocol: every instance announces itself by broadcasting a small
 * JSON payload to the LAN broadcast address every 2 seconds, and
 * listens for the same broadcasts from other instances. Devices are
 * identified by a UUID generated fresh per process, not by IP —
 * multiple instances can share one IP (e.g. two dev servers on the
 * same laptop) and still be tracked as distinct devices.
 */

const dgram = require("dgram");
const { v4: uuidv4 } = require("uuid");
const { PORT, DISCOVERY_PORT, APP_VERSION } = require("../config/env");
const { getLocalIPAddress } = require("../utils/network");

const BROADCAST_INTERVAL_MS = 2000;
const DEVICE_TIMEOUT_MS = 10000;
const BROADCAST_ADDRESS = "255.255.255.255";

// Generated once per process — persists for the server's lifetime,
// regenerated only on a real restart. A browser refresh never
// touches this, since discovery runs independently of any tab.
const deviceId = uuidv4();
const deviceName = `Beam-${deviceId.slice(0, 6)}`;

const registry = new Map(); // deviceId -> { deviceId, deviceName, ip, port, version, lastSeen }

let socket = null;
let broadcastTimer = null;
let sweepTimer = null;
let onUpdate = null;

function buildAnnouncement() {
  return Buffer.from(
    JSON.stringify({
      deviceId,
      deviceName,
      ip: getLocalIPAddress(),
      port: PORT,
      version: APP_VERSION,
    })
  );
}

function handleMessage(msg, rinfo) {
  let data;
  try {
    data = JSON.parse(msg.toString());
  } catch {
    return; // Not our protocol — ignore silently rather than crash.
  }
  if (!data || typeof data.deviceId !== "string" || data.deviceId === deviceId) return;

  const isNew = !registry.has(data.deviceId);
  registry.set(data.deviceId, {
    deviceId: data.deviceId,
    deviceName: data.deviceName || "Unknown Device",
    ip: data.ip || rinfo.address,
    port: data.port,
    version: data.version,
    lastSeen: Date.now(),
  });

  if (isNew) notify();
}

function sweepStaleDevices() {
  const now = Date.now();
  let removed = false;
  for (const [id, device] of registry) {
    if (now - device.lastSeen > DEVICE_TIMEOUT_MS) {
      registry.delete(id);
      removed = true;
    }
  }
  if (removed) notify();
}

function notify() {
  if (onUpdate) onUpdate(getDevices());
}

/**
 * Returns the current registry as a plain array, excluding this
 * instance itself — a device shouldn't show up in its own "nearby
 * devices" list.
 */
function getDevices() {
  return Array.from(registry.values());
}

/**
 * Starts broadcasting and listening. `onUpdateCallback`, if given, is
 * invoked with the full device array whenever it changes: on the
 * regular 2s broadcast tick, immediately when a new device is first
 * seen, and immediately after a stale device is swept out.
 * @param {(devices: Array<Object>) => void} [onUpdateCallback]
 */
function startDiscoveryService(onUpdateCallback) {
  onUpdate = onUpdateCallback || null;

  socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  socket.on("message", handleMessage);
  socket.on("error", (err) => {
    console.error("[discovery] socket error:", err.message);
  });

  socket.bind(DISCOVERY_PORT, () => {
    socket.setBroadcast(true);
    console.log(`[discovery] listening on UDP ${DISCOVERY_PORT} — deviceId=${deviceId}`);
  });

  broadcastTimer = setInterval(() => {
    const payload = buildAnnouncement();
    socket.send(payload, 0, payload.length, DISCOVERY_PORT, BROADCAST_ADDRESS, (err) => {
      if (err) console.error("[discovery] broadcast error:", err.message);
    });
    notify();
  }, BROADCAST_INTERVAL_MS);

  sweepTimer = setInterval(sweepStaleDevices, BROADCAST_INTERVAL_MS);
}

function stopDiscoveryService() {
  if (broadcastTimer) clearInterval(broadcastTimer);
  if (sweepTimer) clearInterval(sweepTimer);
  if (socket) socket.close();
  broadcastTimer = null;
  sweepTimer = null;
  socket = null;
}

module.exports = {
  startDiscoveryService,
  stopDiscoveryService,
  getDevices,
};
