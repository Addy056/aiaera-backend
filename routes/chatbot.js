// backend/routes/chatbot.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createChatbot,
  updateChatbot,
  deleteChatbot,
  getPublicChatbotConfig,
  publicChatbot,
} from "../controllers/chatbotController.js";
import supabase from "../config/supabaseClient.js";

const router = express.Router();

/* ------------------------------
   Async handler wrapper
------------------------------ */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* ============================================================
   🔹 PUBLIC CHATBOT MESSAGE
   POST /api/chatbot/public/:id
============================================================ */
router.post(
  "/public/:id",
  asyncHandler(async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    try {
      await publicChatbot(req, res);
    } catch (error) {
      console.error("🔥 Public chatbot error:", error);
      return res.status(500).json({
        error: "Chatbot failed to process your request",
      });
    }
  })
);

/* ============================================================
   🔹 PUBLIC CHATBOT CONFIG (iframe)
   GET /api/chatbot/config/:id
============================================================ */
router.get(
  "/config/:id",
  asyncHandler(async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    try {
      await getPublicChatbotConfig(req, res);
    } catch (error) {
      console.error("🔥 Public config error:", error);
      return res.status(500).json({ error: "Failed to load chatbot config" });
    }
  })
);

/* ============================================================
   🔒 PROTECTED ROUTES (USER LOGGED IN)
============================================================ */
router.use(requireAuth);

/* CREATE */
router.post("/", asyncHandler(createChatbot));

/* UPDATE */
router.put("/:id", asyncHandler(updateChatbot));

/* DELETE */
router.delete("/:id", asyncHandler(deleteChatbot));

export default router;
