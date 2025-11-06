// backend/routes/chatbotPreview.js
import express from "express";
import { getChatbotPreviewReply } from "../controllers/chatbotPreviewController.js";

const router = express.Router();

/**
 * ✅ Quick GET endpoint for browser testing
 * When you open https://aiaera-backend.onrender.com/api/chatbot-preview
 * it confirms the route is live.
 */
router.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "✅ Chatbot preview endpoint is active. Use POST /api/chatbot-preview to test chatbot replies.",
  });
});

/**
 * Helper to wrap async route handlers
 * Prevents unhandled promise rejections
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * ✅ POST /api/chatbot-preview
 * Public route — no auth required (for Builder preview)
 */
router.post("/", asyncHandler(getChatbotPreviewReply));

export default router;
