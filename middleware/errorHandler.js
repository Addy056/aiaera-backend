// backend/middleware/errorHandler.js

/**
 * Centralized, production-safe error handler.
 * Automatically sanitizes Supabase, Axios, and Meta webhook errors.
 */
export const errorHandler = (err, req, res, next) => {
  const env = process.env.NODE_ENV || "development";

  // Ensure error is always an object
  if (!err || typeof err !== "object") {
    err = { message: String(err) };
  }

  // Determine status code
  const status =
    err.statusCode ||
    err.status ||
    (err.code === "ECONNRESET" ? 503 : 500);

  /* -------------------------------------------------------
   * 🛡️ Sanitize error for production
   * ------------------------------------------------------- */
  let safeMessage =
    err.publicMessage ||
    err.message ||
    "Something went wrong. Please try again.";

  // Handle Supabase errors
  if (err?.message?.includes("PostgREST")) {
    safeMessage = "Database error. Please try again.";
  }

  // Handle unknown object errors from Axios, Meta API, Facebook API
  if (err?.response?.data) {
    safeMessage =
      err.response.data?.error?.message ||
      err.response.data?.message ||
      "External service error.";
  }

  // Handle node-fetch timeouts
  if (err?.name === "AbortError") {
    safeMessage = "Request timed out. Please try again.";
  }

  // Handle stream abort
  if (err?.code === "ECONNRESET") {
    safeMessage = "Connection interrupted. Please retry.";
  }

  /* -------------------------------------------------------
   * 📝 Logging
   * ------------------------------------------------------- */
  if (env !== "production") {
    console.error("🔥 ErrorHandler:", err);
  } else {
    console.error("🔥 Error:", safeMessage);
  }

  /* -------------------------------------------------------
   * 📤 Send final response
   * ------------------------------------------------------- */
  const response = {
    success: false,
    error: safeMessage,
  };

  // Include stack trace ONLY in development
  if (env !== "production") {
    response.stack = err.stack || String(err);
  }

  return res.status(status).json(response);
};
