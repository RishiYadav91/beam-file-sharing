/**
 * utils/network.js
 * ----------------
 * Utility functions for network interface discovery, IP caching, and URL building.
 */

const os = require("os");
const { HOST, PORT } = require("../config/env");

/**
 * Discovers the machine's primary local IPv4 LAN address.
 * Scans os.networkInterfaces() for valid non-internal IPv4 addresses.
 *
 * @returns {string} The active LAN IPv4 address or "localhost"
 */
function detectLocalIPAddress() {
  try {
    if (HOST && HOST !== "0.0.0.0" && HOST !== "localhost") {
      return HOST;
    }

    const interfaces = os.networkInterfaces();
    let candidateIP = null;

    for (const name of Object.keys(interfaces)) {
      const lowerName = name.toLowerCase();
      const isVirtual =
        lowerName.includes("vbox") ||
        lowerName.includes("docker") ||
        lowerName.includes("vmware") ||
        lowerName.includes("vethernet");

      for (const net of interfaces[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          if (!isVirtual) {
            return net.address;
          }
          if (!candidateIP) {
            candidateIP = net.address;
          }
        }
      }
    }

    return candidateIP || "localhost";
  } catch (err) {
    console.warn(
      "[network] Failed to detect LAN IP address, falling back to localhost:",
      err.message
    );
    return "localhost";
  }
}

// Cache the detected LAN IP on module load
let cachedLANIP = detectLocalIPAddress();

/**
 * Returns the cached LAN IP address.
 * Optional parameter to force a fresh interface re-scan if needed.
 *
 * @param {boolean} [refresh=false]
 * @returns {string}
 */
function getLocalIPAddress(refresh = false) {
  if (refresh) {
    cachedLANIP = detectLocalIPAddress();
  }
  return cachedLANIP;
}

/**
 * Constructs the canonical download URL for a file.
 * Encapsulates URL formatting logic so controllers remain clean.
 *
 * @param {string} fileId - The unique file identifier.
 * @param {string} [protocol="http"] - HTTP protocol scheme.
 * @returns {string} Fully qualified download URL.
 */
function buildDownloadUrl(fileId, protocol = "http") {
  const lanHost = getLocalIPAddress();
  return `${protocol}://${lanHost}:${PORT}/api/download/${fileId}`;
}

module.exports = {
  getLocalIPAddress,
  buildDownloadUrl,
};
