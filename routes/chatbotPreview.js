// backend/routes/chatbotPreview.js
import express from "express";
import { getChatbotPreviewReply } from "../controllers/chatbotPreviewController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Helper to wrap async route handlers
 * Prevents unhandled promise rejections
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * POST /api/chatbot-preview
 * In production → requires auth
 * In development → no auth for easier testing
 */
router.post(
  "/",
  process.env.NODE_ENV === "production" ? requireAuth : (req, res, next) => next(),
  asyncHandler(getChatbotPreviewReply)
);

export default router;
