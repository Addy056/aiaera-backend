// backend/middleware/requestLogger.js

/**
 * Advanced Request Logger for Express.
 * - Logs method, URL, status code, duration
 * - Logs client IP, user agent (dev only)
 * - Warns on slow requests (> 1200ms)
 * - Handles aborted requests (e.g., interrupted streams)
 * - Minimal logs in production
 */
export const requestLogger = (req, res, next) => {
  const env = process.env.NODE_ENV || "development";
  const start = Date.now();

  // Track aborted requests (e.g., streaming closed early)
  let aborted = false;
  req.on("aborted", () => {
    aborted = true;
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;
    const ip = req.ip || req.connection.remoteAddress;

    const logBase = `${method} ${url} ${status} - ${duration}ms`;

    // Slow request warning
    const slow = duration > 1200 ? " ⏳ (SLOW)" : "";

    if (env !== "production") {
      // Full debug logs in development
      console.log(
        `📥 ${logBase}${slow} | IP: ${ip} | UA: ${req.headers["user-agent"] || "unknown"}${
          aborted ? " ⚠️ (aborted)" : ""
        }`
      );
    } else {
      // Production: only log warnings/errors
      if (status >= 400 || aborted || slow) {
        console.warn(
          `⚠️ ${logBase}${slow}${aborted ? " ⚠️ (aborted)" : ""}`
        );
      }
    }
  });

  next();
};
