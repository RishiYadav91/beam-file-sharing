/**
 * services/discoveryService.js
 * ------------------------------
 * Frontend wrapper for the LAN device-discovery channel. Reuses the
 * same shared socket as transfer status (via acquireSocket/
 * releaseSocket in socketService.js) rather than opening a second
 * connection — this file never imports socket.io-client directly.
 */

import { acquireSocket, releaseSocket } from "./socketService";

const EVENT_DEVICES = "discovery:devices";

/**
 * Subscribes to live nearby-device list updates. Calls `onUpdate`
 * with the full device array every time the backend pushes a change.
 * @param {(devices: Array<Object>) => void} onUpdate
 * @returns {() => void} Unsubscribe function — call on unmount.
 */
export function subscribeToDeviceUpdates(onUpdate) {
  const socket = acquireSocket();

  const handleDevices = (devices) => onUpdate(Array.isArray(devices) ? devices : []);

  // Defensive off-before-on, same dedup guard used throughout the
  // rest of the app for this shared singleton socket.
  socket.off(EVENT_DEVICES, handleDevices);
  socket.on(EVENT_DEVICES, handleDevices);

  return () => {
    socket.off(EVENT_DEVICES, handleDevices);
    releaseSocket();
  };
}
