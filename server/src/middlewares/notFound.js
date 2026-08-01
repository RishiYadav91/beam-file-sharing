/**
 * middlewares/notFound.js
 * -------------------------
 * Catches any request that didn't match a route above it in the
 * middleware stack and turns it into a consistent 404 JSON response,
 * instead of Express's default HTML error page.
 *
 * Must be registered AFTER all routes and BEFORE errorHandler.
 */

function notFound(req, res, next) {
  res.status(404).json({
    status: "error",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = notFound;
