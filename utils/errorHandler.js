// backend/utils/errorHandler.js

/**
 * Centralized error handler for backend controllers.
 *
 * Ensures:
 *  - Clean & consistent error responses
 *  - Dev-friendly full stack traces
 *  - Silent production logs (only message)
 *  - Avoids "Can't set headers after they are sent"
 *
 * @param {object} res - Express Response
 * @param {any} error - Error object or string
 * @param {object} [options]
 * @param {number} [options.status=500] - Status code
 * @param {string} [options.customMessage] - Custom client-facing error message
 */
export function handleError(res, error, options = {}) {
  const status = options.status || 500;

  // Normalize error message
  const message =
    typeof error === "string"
      ? error
      : error?.message || "Unexpected server error";

  // Detailed logs only in development
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    console.error(
      "❌ [Controller Error]",
      message,
      error?.stack || error
    );
  } else {
    console.error("❌ [Error]", message);
  }

  // Avoid double responses
  if (res.headersSent) {
    return;
  }

  // Return safe JSON response
  return res.status(status).json({
    success: false,
    error: options.customMessage || message,
    ...(isProd ? {} : { stack: error?.stack }) // Only show stack in development
  });
}
