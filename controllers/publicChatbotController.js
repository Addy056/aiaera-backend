// backend/controllers/publicChatbotController.js
import supabase from "../config/supabaseClient.js";
import { handleError } from "../utils/errorHandler.js";
import fetch from "node-fetch";

// ----------------------
// Helper: Generate Google Maps link
// ----------------------
const getGoogleMapsLink = (location) => {
  if (!location?.latitude || !location?.longitude) return null;
  return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
};

// ✅ Get chatbot config (public access)
export const getPublicChatbot = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Chatbot ID is required" });

    const { data: chatbot, error } = await supabase
      .from("chatbot_configs")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !chatbot) {
      return res.status(404).json({ error: "Chatbot not found" });
    }

    // ✅ Normalize fields
    const normalizedConfig = {
      id: chatbot.id,
      name: chatbot.name || "AI Chatbot",
      businessDescription: chatbot.businessDescription || "",
      websiteUrl: chatbot.websiteUrl || "",
      files: Array.isArray(chatbot.files) ? chatbot.files : [],
      logoUrl: chatbot.logoUrl || null,
      businessAddress: chatbot.businessAddress || null,
      calendlyLink: chatbot.calendlyLink || null,
      location: chatbot.location || null,
      googleMapsLink: getGoogleMapsLink(chatbot.location),
    };

    res.status(200).json({ success: true, data: normalizedConfig });
  } catch (err) {
    handleError(res, err);
  }
};

// ✅ Handle incoming chatbot messages (public)
export const sendPublicMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, history = [] } = req.body;

    if (!id) return res.status(400).json({ error: "Chatbot ID is required" });
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message must be a valid string" });
    }

    // 🔹 Get chatbot config
    const { data: chatbot, error } = await supabase
      .from("chatbot_configs")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !chatbot) {
      return res.status(404).json({ error: "Chatbot not found" });
    }

    // 🔹 Validate AI API credentials
    if (!process.env.AI_API_URL || !process.env.AI_API_KEY) {
      return res.status(500).json({ error: "AI API not configured" });
    }

    // 🔹 Call AI API (with timeout)
    let aiResponse;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(process.env.AI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          prompt: message,
          history,
          config: chatbot,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`AI API failed with status ${response.status}`);
      }

      aiResponse = await response.json();
    } catch (err) {
      console.error("AI API error:", err.message);
      return res.status(502).json({ error: "Failed to get AI response" });
    }

    res.status(200).json({
      reply: aiResponse.reply || "I’m here to help!",
    });
  } catch (err) {
    handleError(res, err);
  }
};
