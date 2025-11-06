// backend/middleware/errorHandler.js
/**
 * Global error handling middleware for Express.
 * Ensures consistent JSON responses and safe logging.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const env = process.env.NODE_ENV || "development";

  // Log error details (stack only in non-production)
  if (env !== "production") {
    console.error("❌ ErrorHandler:", err.stack || err);
  } else {
    console.error("❌ ErrorHandler:", err.message);
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal Server Error",
    ...(env !== "production" && { stack: err.stack }), // include stack trace in dev only
  });
};
