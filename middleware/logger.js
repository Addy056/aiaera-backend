// backend/middleware/requestLogger.js
/**
 * Request logger middleware for Express.
 * Logs method, URL, status code, and response time.
 * Only logs detailed info in non-production environments.
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

    if (process.env.NODE_ENV !== "production") {
      console.log("📥", log);
    } else if (res.statusCode >= 400) {
      // In production, only log warnings/errors
      console.warn("⚠️", log);
    }
  });

  next();
};
