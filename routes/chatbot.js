// backend/routes/chatbot.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createChatbot,
  getUserChatbots,
  updateChatbot,
  deleteChatbot,
  retrainChatbot,
  previewChat,
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
   🔹 PUBLIC CHATBOT MESSAGE ROUTE
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
   🔹 PUBLIC CHATBOT CONFIG ROUTE
   GET /api/chatbot/config/:id
   Ensures pure JSON → prevents iframe fallback HTML
============================================================ */
router.get(
  "/config/:id",
  asyncHandler(async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    const { id } = req.params;

    // Fetch chatbot from DB
    const { data: chatbot, error } = await supabase
      .from("chatbots")
      .select("id, name, business_info, welcome_message, config")
      .eq("id", id)
      .single();

    // Handle missing chatbot
    if (error || !chatbot) {
      console.error("❌ Chatbot not found:", error);
      return res.status(404).json({ error: "Chatbot not found" });
    }

    // Parse config safely
    let configData = {};
    try {
      configData =
        typeof chatbot.config === "string"
          ? JSON.parse(chatbot.config)
          : chatbot.config || {};
    } catch (e) {
      console.error("Config parse error:", e);
      configData = {};
    }

    // Build final JSON response
    const response = {
      id: chatbot.id,
      name: chatbot.name || "AI Chatbot",
      business_info: chatbot.business_info || "",
      welcome_message:
        chatbot.welcome_message ||
        configData.welcome_message ||
        "Hi! How may I help you?",
      logo_url: configData.logo_url || "",
      themeColors: configData.themeColors || { userBubble: "#7f5af0" },
      website_url: configData.website_url || "",
      files: configData.files || [],
      sources: configData.sources || {},
    };

    return res.status(200).json(response);
  })
);

/* ============================================================
   🔹 PREVIEW ROUTE (BUILDER PAGE)
============================================================ */
router.post("/preview", asyncHandler(previewChat));

/* ============================================================
   🔒 PROTECTED ROUTES (USER LOGGED IN)
============================================================ */
router.use(requireAuth);

router.post("/", asyncHandler(createChatbot));
router.get("/", asyncHandler(getUserChatbots));
router.put("/:id", asyncHandler(updateChatbot));
router.delete("/:id", asyncHandler(deleteChatbot));

router.post(
  "/retrain",
  asyncHandler(async (req, res) => {
    if (req.user?.id) req.body.userId = req.user.id;
    await retrainChatbot(req, res);
  })
);

export default router;
