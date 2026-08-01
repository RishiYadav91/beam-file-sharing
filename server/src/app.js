/**
 * src/app.js
 * ----------
 * Builds and configures the Express application: global middleware,
 * routes, and error handling — but does NOT call app.listen(). That
 * separation (see server.js) lets this module be imported directly
 * in tests without binding a real port.
 *
 * Middleware order matters in Express, so it's laid out top to
 * bottom exactly as requests flow through it:
 *   1. cors        - allow the frontend's origin to call this API
 *   2. morgan       - log every incoming request
 *   3. express.json - parse JSON request bodies
 *   4. routes       - the actual API (/api/...)
 *   5. notFound     - catch anything that didn't match a route
 *   6. errorHandler - catch anything that threw/failed
 */

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { CLIENT_URL, NODE_ENV } = require("./config/env");
const routes = require("./routes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(
  cors({
    origin: CLIENT_URL,
  })
);

// "dev" format is concise and color-coded, ideal for local work.
// "combined" is the standard Apache-style log, better for production.
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
