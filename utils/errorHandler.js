// backend/utils/errorHandler.js

/**
 * Centralized error handler for backend controllers.
 *
 * @param {object} res - Express response object
 * @param {Error|string|any} error - Error object or message
 * @param {object} [options] - Optional settings
 * @param {number} [options.status=500] - HTTP status code
 * @param {string} [options.customMessage] - Custom error message to send to client
 */
export function handleError(res, error, options = {}) {
  const message = error?.message || error || 'Unknown error';

  // Log full error in non-production
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', message, error?.stack || '');
  }

  // Send response if headers not already sent
  if (!res.headersSent) {
    res.status(options.status || 500).json({
      success: false,
      error: options.customMessage || message,
    });
  }
}
