// backend/routes/chatbotPreview.js
import express from "express";
import { getChatbotPreviewReply } from "../controllers/chatbotPreviewController.js";

const router = express.Router();

/**
 * ✅ GET /api/chatbot-preview
 * Health check endpoint (for Render uptime or manual verification)
 */
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    route: "/api/chatbot-preview",
    message:
      "✅ Chatbot preview endpoint is active. Use POST /api/chatbot-preview for chatbot replies.",
  });
});

/**
 * Helper: Async route wrapper (to catch async errors cleanly)
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * ✅ POST /api/chatbot-preview
 * Main route used by the frontend builder preview.
 * Accepts:
 *   - messages[] (conversation so far)
 *   - userId (Supabase auth.user.id)
 * Optional:
 *   - chatbotConfig (temporary, for non-persistent previews)
 *
 * Returns: { success, reply, provider }
 */
router.post("/", asyncHandler(async (req, res, next) => {
  const { messages, userId } = req.body || {};

  // Basic validation
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Invalid request: 'messages' array is required.",
    });
  }

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: "Invalid request: 'userId' is required.",
    });
  }

  console.log(`💬 [ChatbotPreview] Incoming message from user ${userId}`);

  // Delegate to controller
  return getChatbotPreviewReply(req, res, next);
}));

/**
 * ⚠️ Catch-all for invalid subroutes
 * Prevents confusion when testing URLs manually
 */
router.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `❌ Invalid route "${req.originalUrl}". Try POST /api/chatbot-preview.`,
  });
});

export default router;
