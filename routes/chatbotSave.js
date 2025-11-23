// backend/routes/chatbotSave.js
import express from "express";
import { saveChatbotConfig } from "../controllers/chatbotSaveController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireActiveSubscription } from "../middleware/subscriptionMiddleware.js";

const router = express.Router();

/**
 * Helper wrapper to catch async errors
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("❌ [ChatbotSaveRoute] Unexpected error:", err);
    next(err);
  });

/**
 * ---------------------------------------------------------
 * POST /api/chatbot/save
 * Save or update chatbot configuration
 *
 * Middlewares:
 *   - requireAuth                 → user must be logged in
 *   - requireActiveSubscription   → Builder requires active plan
 * ---------------------------------------------------------
 */
router.post(
  "/save",
  requireAuth,
  requireActiveSubscription,
  asyncHandler(async (req, res, next) => {
    // Basic validation (extra safety)
    const { userId, name } = req.body || {};

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Missing userId",
      });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Chatbot name is required",
      });
    }

    console.log(`🛠️ [ChatbotSave] Saving config for user ${userId}`);

    // Call controller
    return saveChatbotConfig(req, res, next);
  })
);

export default router;
