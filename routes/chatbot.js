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

/* ------------------------------
   🔹 Public chatbot route (for deployed widgets)
   Example: POST /api/chatbot/public/:id
------------------------------ */
router.post(
  "/public/:id",
  asyncHandler(async (req, res) => {
    await publicChatbot(req, res);
  })
);

/* ------------------------------
   🔹 NEW: Public chatbot config route
   Example: GET /api/chatbot/config/:id
   Returns chatbot details for /public-chatbot/:id
------------------------------ */
router.get(
  "/config/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Fetch chatbot details
    const { data: chatbot, error } = await supabase
      .from("chatbots")
      .select("id, name, business_info, config")
      .eq("id", id)
      .single();

    if (error || !chatbot) {
      console.error("Chatbot not found or Supabase error:", error);
      return res.status(404).json({ error: "Chatbot not found" });
    }

    // Parse chatbot config safely
    let configData = {};
    try {
      configData =
        typeof chatbot.config === "string"
          ? JSON.parse(chatbot.config)
          : chatbot.config || {};
    } catch {
      configData = {};
    }

    // Build response
    const response = {
      id: chatbot.id,
      name: chatbot.name || "AI Chatbot",
      business_info: chatbot.business_info || "",
      logo_url: configData.logo_url || "",
      themeColors: configData.themeColors || { userBubble: "#7f5af0" },
      website_url: configData.website_url || "",
      files: configData.files || [],
    };

    return res.json(response);
  })
);

/* ------------------------------
   🔹 Preview chatbot (Builder Preview)
   Example: POST /api/chatbot/preview
------------------------------ */
router.post("/preview", asyncHandler(previewChat));

/* ------------------------------
   🔒 Protected Routes (Require Auth)
------------------------------ */
router.use(requireAuth);

/* --- CRUD Routes --- */
router.post("/", asyncHandler(createChatbot));
router.get("/", asyncHandler(getUserChatbots));
router.put("/:id", asyncHandler(updateChatbot));
router.delete("/:id", asyncHandler(deleteChatbot));

/* --- Retrain Chatbot --- */
router.post(
  "/retrain",
  asyncHandler(async (req, res) => {
    if (req.user?.id) req.body.userId = req.user.id;
    await retrainChatbot(req, res);
  })
);

export default router;
