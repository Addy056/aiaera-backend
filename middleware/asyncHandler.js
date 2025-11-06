// backend/utils/asyncHandler.js
/**
 * Wrapper to handle async errors in Express routes.
 * Ensures errors are passed to Express error middleware.
 *
 * Usage:
 *   router.get("/example", asyncHandler(async (req, res) => {
 *     const data = await fetchSomething();
 *     res.json(data);
 *   }));
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error("[AsyncHandler] Error caught:", err.message || err);
      next(err); // Pass to Express error handler
    });
  };
};
