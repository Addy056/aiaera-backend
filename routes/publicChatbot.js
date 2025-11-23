// backend/routes/publicChatbot.js
import express from "express";
import {
  getPublicChatbot,
  sendPublicMessage,
} from "../controllers/publicChatbotController.js";

const router = express.Router();

/* -------------------------------------------------------
   Public Chatbot Routes
   Used for the embed widget + public chatbot page
------------------------------------------------------- */

/**
 * GET /api/public-chatbot/:id
 * Fetch public chatbot configuration
 */
router.get("/:id", async (req, res, next) => {
  try {
    await getPublicChatbot(req, res);
  } catch (err) {
    console.error("❌ Error in GET /public-chatbot/:id:", err);
    next(err);
  }
});

/**
 * POST /api/public-chatbot/:id/message
 * Send a chat message → returns AI reply
 */
router.post("/:id/message", async (req, res, next) => {
  try {
    await sendPublicMessage(req, res);
  } catch (err) {
    console.error("❌ Error in POST /public-chatbot/:id/message:", err);
    next(err);
  }
});

/**
 * Fallback for invalid routes
 */
router.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Invalid public chatbot endpoint: ${req.originalUrl}`,
  });
});

export default router;
