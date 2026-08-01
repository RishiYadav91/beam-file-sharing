/**
 * routes/index.js
 * ----------------
 * Aggregates every feature router into one, so app.js only needs a
 * single `app.use("/api", routes)` line. Adding a new feature later
 * (e.g. upload.routes.js) means creating that file and registering
 * it here — app.js itself never needs to change.
 */

const express = require("express");
const healthRoutes = require("./health.routes");
const uploadRoutes = require("./upload.routes");
const downloadRoutes = require("./download.routes");

const router = express.Router();

router.use(healthRoutes);
router.use(uploadRoutes);
router.use(downloadRoutes);

module.exports = router;

