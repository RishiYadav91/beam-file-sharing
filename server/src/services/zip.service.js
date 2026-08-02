/**
 * services/zip.service.js
 * ------------------------
 * Streams a ZIP archive built from multiple files directly to an
 * HTTP response, using the "archiver" package.
 *
 * Nothing is buffered in memory and no temporary archive file is
 * ever written to disk: archiver pipes straight into `res`, and each
 * source file is piped straight into archiver from a read stream.
 * Because of that, there's nothing to delete afterward — the "delete
 * any temporary archive" requirement is satisfied by construction
 * (there's no temp artifact in the first place), rather than by
 * cleaning one up after the fact.
 */

const fs = require("fs");
const archiver = require("archiver");

/**
 * @param {import("express").Response} res - destination stream
 * @param {Array<{absolutePath: string, entryName: string}>} files
 * @param {Object} [options]
 * @param {number} [options.totalSize] - sum of source file sizes, used for progress %
 * @param {(percent: number) => void} [options.onProgress]
 * @returns {Promise<void>} resolves once the response has fully flushed
 */
function streamZip(res, files, options = {}) {
  const { totalSize = 0, onProgress } = options;

  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 6 } });
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    const succeed = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    archive.on("error", fail);
    archive.on("warning", (err) => {
      // Non-blocking warnings (e.g. stat issues) still indicate a
      // broken entry in this context — treat them as failures rather
      // than silently producing an incomplete ZIP.
      if (err.code !== "ENOENT") fail(err);
    });

    if (onProgress && totalSize > 0) {
      let lastPercent = -1;
      archive.on("progress", (data) => {
        const percent = Math.min(100, Math.floor((data.fs.processedBytes / totalSize) * 100));
        if (percent !== lastPercent) {
          lastPercent = percent;
          onProgress(percent);
        }
      });
    }

    res.on("finish", succeed);
    res.on("close", () => {
      if (!res.writableEnded) fail(new Error("Client disconnected during archive stream"));
    });

    archive.pipe(res);
    for (const file of files) {
      archive.append(fs.createReadStream(file.absolutePath), { name: file.entryName });
    }
    archive.finalize();
  });
}

module.exports = { streamZip };
