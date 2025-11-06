// backend/routes/chatbotPreview.js
import express from "express";
import { getChatbotPreviewReply } from "../controllers/chatbotPreviewController.js";

const router = express.Router();

/**
 * ✅ Health Check Endpoint
 * Helps confirm the route is live on Render.
 * Example: https://aiaera-backend.onrender.com/api/chatbot-preview
 */
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    route: "/api/chatbot-preview",
    message: "✅ Chatbot preview endpoint is active. Send a POST request for chatbot replies.",
  });
});

/**
 * Helper: Async route wrapper (for cleaner error handling)
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * ✅ POST /api/chatbot-preview
 * Used by the Builder’s live chatbot preview
 * Public (no authentication) to simplify testing
 */
router.post("/", asyncHandler(getChatbotPreviewReply));

/**
 * ⚠️ Catch-all for undefined subroutes
 * Helps debug route mismatches (prevents "Route not found")
 */
router.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Invalid route. Try POST /api/chatbot-preview instead of "${req.originalUrl}".`,
  });
});

export default router;
