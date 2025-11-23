// backend/utils/asyncHandler.js

/**
 * Express async wrapper to safely handle errors.
 * Ensures:
 *  - No unhandled promise rejections
 *  - Errors always forwarded to global error middleware
 *  - Clean console logging (with stack traces in dev)
 */

export const asyncHandler = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      // Log clean error
      console.error(
        "🔥 [AsyncHandler Error]:",
        err?.message || err,
        process.env.NODE_ENV !== "production" ? `\n${err?.stack}` : ""
      );

      // Ensure it's passed as an Error object
      next(err instanceof Error ? err : new Error(err));
    }
  };
};
