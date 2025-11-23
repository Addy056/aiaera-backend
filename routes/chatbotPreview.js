// backend/routes/chatbotPreview.js
import express from "express";
import { getChatbotPreviewReply } from "../controllers/chatbotPreviewController.js";

const router = express.Router();

/**
 * ---------------------------------------------
 * GET /api/chatbot-preview
 * Health check for Render / manual testing
 * ---------------------------------------------
 */
router.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    route: "/api/chatbot-preview",
    message:
      "✅ Chatbot preview endpoint is active. Use POST /api/chatbot-preview for chatbot responses.",
  });
});

/**
 * ---------------------------------------------
 * Helper: safe async wrapper
 * ---------------------------------------------
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("❌ [ChatbotPreviewRoute] Unexpected error:", err);
    next(err);
  });

/**
 * ---------------------------------------------
 * POST /api/chatbot-preview
 * Builder-side preview (NO subscription required)
 * ---------------------------------------------
 *
 * Required:
 *   - messages[]: array of chat history
 *   - userId: Supabase user id
 *
 * Returns:
 *   - { success, reply, context }
 */
router.post(
  "/",
  asyncHandler(async (req, res, next) => {
    const { messages, userId } = req.body || {};

    // Basic validations
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid request: messages[] is required.",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Invalid request: userId is required.",
      });
    }

    console.log(
      `💬 [ChatbotPreview] New preview request → user=${userId}, message="${messages[messages.length - 1]?.content}"`
    );

    // Call controller
    return getChatbotPreviewReply(req, res, next);
  })
);

/**
 * ---------------------------------------------
 * Catch-all for wrong preview routes
 * ---------------------------------------------
 */
router.all("*", (req, res) => {
  return res.status(404).json({
    success: false,
    error: `❌ Invalid route "${req.originalUrl}". Try POST /api/chatbot-preview instead.`,
  });
});

export default router;
