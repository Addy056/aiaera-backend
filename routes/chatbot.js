import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createChatbot,
  getUserChatbots,
  updateChatbot,
  deleteChatbot,
  retrainChatbot,
  previewChat,
} from "../controllers/chatbotController.js";
import supabase from "../config/supabaseClient.js";

const router = express.Router();

// ----------------------
// Async wrapper for cleaner error handling
// ----------------------
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ----------------------
// Public chatbot route (no auth required)
// ----------------------
router.get(
  "/public/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id)
      return res
        .status(400)
        .json({ success: false, error: "Invalid chatbot ID" });

    // Fetch chatbot
    const { data: chatbotData, error: chatbotError } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", id)
      .single();

    if (chatbotError || !chatbotData) {
      return res
        .status(404)
        .json({ success: false, error: "Chatbot not found" });
    }

    // Parse config safely
    let config = {};
    try {
      config =
        typeof chatbotData.config === "string"
          ? JSON.parse(chatbotData.config)
          : chatbotData.config || {};
    } catch (parseErr) {
      console.warn(
        `Failed to parse chatbot config for chatbot ${id}:`,
        parseErr?.message || parseErr
      );
      config = {};
    }

    // Fetch user integrations
    const { data: integrationData, error: integrationError } = await supabase
      .from("user_integrations")
      .select("business_address, business_lat, business_lng, calendly_link")
      .eq("user_id", chatbotData.user_id)
      .maybeSingle();

    if (integrationError) {
      // Log it so we can see why location/address might be missing
      console.warn(
        `Failed to fetch integrations for user ${chatbotData.user_id}:`,
        integrationError.message || integrationError
      );
    }

    const integrations = integrationData || {};

    // Determine business description (try multiple possible column names)
    const businessDescription =
      chatbotData.business_description ??
      chatbotData.businessInfo ??
      chatbotData.business_info ??
      null;

    // Build public chatbot object
    const publicChatbot = {
      id: chatbotData.id,
      name: chatbotData.name,
      businessDescription,
      websiteUrl: config?.website_url || null,
      logoUrl: config?.logo_url || null,
      files: Array.isArray(config?.files) ? config.files : [],
      location: {
        latitude: integrations.business_lat || null,
        longitude: integrations.business_lng || null,
        googleMapsLink:
          integrations.business_lat && integrations.business_lng
            ? `https://www.google.com/maps?q=${integrations.business_lat},${integrations.business_lng}`
            : null,
      },
      businessAddress: integrations.business_address || null,
      calendlyLink: integrations.calendly_link || null,
    };

    return res.json({ success: true, data: publicChatbot });
  })
);

// ----------------------
// Preview route (PUBLIC for website chatbot)
// ----------------------
router.post("/preview", asyncHandler(previewChat));

// ----------------------
// Apply auth middleware for all routes below
// ----------------------
router.use(requireAuth);

// ----------------------
// CRUD routes (require auth)
// ----------------------
router.post("/", asyncHandler(createChatbot));
router.get("/", asyncHandler(getUserChatbots));
router.put("/:id", asyncHandler(updateChatbot));
router.delete("/:id", asyncHandler(deleteChatbot));

// ----------------------
// Retrain route (require auth)
// ----------------------
router.post(
  "/retrain",
  asyncHandler(async (req, res, next) => {
    if (req.user?.id) req.body.userId = req.user.id;
    await retrainChatbot(req, res, next);
  })
);

export default router;
