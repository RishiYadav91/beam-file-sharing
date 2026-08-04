/**
 * config/env.js
 * -------------
 * Single source of truth for reading process.env.
 *
 * Every other file imports values from here instead of touching
 * process.env directly. Benefits:
 *  - One place to see every environment variable the app uses.
 *  - One place to define defaults / fallbacks.
 *  - Easy to swap in validation (e.g. envalid, zod) later without
 *    hunting through the codebase for process.env references.
 */

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT, 10) || 8000,

  // Origin the frontend is served from, used by the CORS middleware.
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

  // Reserved for the upcoming upload feature — read here already so
  // the value has one canonical home once uploads are implemented.
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 2048,

  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || null,

  MAX_FILES_PER_UPLOAD: parseInt(process.env.MAX_FILES_PER_UPLOAD, 10) || 200,
  FILE_EXPIRY_HOURS: parseInt(process.env.FILE_EXPIRY_HOURS, 10) || 24,
  CLEANUP_INTERVAL_MINUTES: parseInt(process.env.CLEANUP_INTERVAL_MINUTES, 10) || 5,
  HOST: process.env.HOST || null,

  // UDP port used for LAN device discovery broadcasts (Milestone 10).
  DISCOVERY_PORT: parseInt(process.env.DISCOVERY_PORT, 10) || 41234,
  APP_VERSION: process.env.APP_VERSION || "1.0.0",
};
