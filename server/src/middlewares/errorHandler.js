/**
 * middlewares/errorHandler.js
 * -----------------------------
 * Express's centralized error handler — any `next(err)` call, or any
 * synchronous throw inside a route handler, ends up here instead of
 * crashing the process or leaking a stack trace to the client.
 *
 * Must be the LAST middleware registered in app.js (Express
 * identifies error handlers by their 4-argument signature).
 */

const multer = require("multer");
const { NODE_ENV } = require("../config/env");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";

  // Handle specific Multer errors
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File size exceeds the maximum allowed limit of 2 GB";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = `Unexpected field '${err.field}'. Please attach file in the 'file' field`;
    } else {
      message = `Upload error: ${err.message}`;
    }
  }

  console.error(`[error] ${req.method} ${req.originalUrl} ->`, err);

  res.status(statusCode).json({
    success: false,
    message,
    // Stack traces are only useful (and safe) to expose in development.
    ...(NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = errorHandler;
