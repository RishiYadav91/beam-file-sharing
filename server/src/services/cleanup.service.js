/**
 * services/cleanup.service.js
 * ----------------------------
 * Background cleanup service for automatic removal of expired files.
 *
 * Periodically scans the in-memory metadata store, deletes expired
 * physical files asynchronously from the disk, and purges their
 * metadata from memory without blocking the Node event loop.
 */

const fs = require("fs").promises;
const { CLEANUP_INTERVAL_MINUTES } = require("../config/env");
const {
  getAllFileMetadata,
  removeFileMetadata,
  isFileExpired,
  getSecureFilePath,
} = require("./file.service");

const MS_PER_MINUTE = 60 * 1000;

let isRunning = false;
let cleanupTimer = null;

/**
 * Scans stored files and removes expired physical files and metadata.
 * Prevents overlapping execution using concurrency locks and logs execution duration.
 */
async function runCleanupJob() {
  if (isRunning) {
    console.log("[Cleanup] Previous cleanup job is still running. Skipping overlapping execution.");
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  console.log("[Cleanup] Starting background file cleanup...");

  try {
    const allMetadata = getAllFileMetadata();
    let removedCount = 0;

    for (const metadata of allMetadata) {
      try {
        if (!isFileExpired(metadata)) {
          continue;
        }

        const filePath = getSecureFilePath(metadata.storedFilename);

        if (filePath) {
          try {
            await fs.stat(filePath);
            await fs.unlink(filePath);
          } catch (err) {
            if (err.code !== "ENOENT") {
              console.error(`[Cleanup] Error deleting physical file for ${metadata.fileId}:`, err.message);
            }
          }
        }

        removeFileMetadata(metadata.fileId);
        removedCount++;

        console.log(
          `[Cleanup] Removed expired file: ${metadata.originalFilename} (fileId: ${metadata.fileId})`
        );
      } catch (fileErr) {
        console.error(`[Cleanup] Error processing cleanup for fileId ${metadata.fileId}:`, fileErr.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cleanup] Finished in ${duration}ms. Removed ${removedCount} expired file(s).`);
  } finally {
    isRunning = false;
  }
}

/**
 * Initializes the background cleanup timer service.
 * Runs an immediate cleanup pass on startup, then schedules recurring passes.
 */
async function startCleanupService() {
  const intervalMs = CLEANUP_INTERVAL_MINUTES * MS_PER_MINUTE;

  console.log(
    `[Cleanup] Background cleanup service initialized (interval: ${CLEANUP_INTERVAL_MINUTES} minute(s))`
  );

  // 1. Immediate startup cleanup pass
  await runCleanupJob();

  // 2. Schedule recurring passes and store timer handle
  if (!cleanupTimer) {
    cleanupTimer = setInterval(runCleanupJob, intervalMs);
  }
}

/**
 * Stops the background cleanup service timer (for graceful shutdown).
 */
function stopCleanupService() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log("[Cleanup] Background cleanup service stopped.");
  }
}

module.exports = {
  startCleanupService,
  stopCleanupService,
  runCleanupJob,
};
