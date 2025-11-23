// backend/controllers/publicChatbotController.js
import supabase from "../config/supabaseClient.js";

/* -------------------------------------------------------
 * Helper: Make Google Maps URL
 * ------------------------------------------------------- */
const makeGoogleMapsLink = (lat, lng) => {
  if (!lat || !lng) return null;
  return `https://maps.google.com/?q=${lat},${lng}`;
};

/* -------------------------------------------------------
 * 1) GET PUBLIC CHATBOT CONFIG (for iframe + preview)
 * ------------------------------------------------------- */
export const getPublicChatbot = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id)
      return res.status(400).json({ success: false, error: "Chatbot ID is required" });

    /* ----------------------------------------------
     * Load chatbot
     * ---------------------------------------------- */
    const { data: bot, error: botErr } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (botErr || !bot) {
      return res.status(404).json({ success: false, error: "Chatbot not found" });
    }

    let cfg = {};
    try {
      cfg = typeof bot.config === "string" ? JSON.parse(bot.config) : bot.config || {};
    } catch {
      cfg = {};
    }

    /* ----------------------------------------------
     * Load Integrations
     * ---------------------------------------------- */
    const { data: integ } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", bot.user_id)
      .maybeSingle();

    /* ----------------------------------------------
     * Load File Data (parsed text)
     * ---------------------------------------------- */
    let allFileText = "";
    const { data: parsedFiles } = await supabase
      .from("chatbot_file_data")
      .select("content")
      .eq("chatbot_id", id);

    if (Array.isArray(parsedFiles)) {
      parsedFiles.forEach((f) => {
        if (f?.content?.text) {
          allFileText += f.content.text + "\n---\n";
        }
      });
    }

    /* ----------------------------------------------
     * Build Google Maps URL
     * ---------------------------------------------- */
    const mapsUrl = makeGoogleMapsLink(
      integ?.business_lat,
      integ?.business_lng
    );

    /* ----------------------------------------------
     * Final normalized config
     * ---------------------------------------------- */
    const response = {
      id: bot.id,
      name: bot.name || "AI Assistant",
      businessDescription: bot.business_info || "",
      websiteUrl: cfg.businessWebsite || cfg.website_url || "",
      logoUrl: cfg.logo_url || null,
      themeColors: cfg.themeColors || null,
      files: cfg.files || [],
      calendlyLink: integ?.calendly_link || null,
      businessAddress: integ?.business_address || null,
      location: {
        latitude: integ?.business_lat || null,
        longitude: integ?.business_lng || null,
      },
      googleMapsLink: mapsUrl || null,
      fileText: allFileText || "",
    };

    return res.json({ success: true, data: response });
  } catch (err) {
    console.error("❌ publicChatbotController Error:", err);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

/* -------------------------------------------------------
 * 2) PUBLIC MESSAGE (for NON-stream fallback — optional)
 * ------------------------------------------------------- */
export const sendPublicMessage = async (req, res) => {
  try {
    return res.status(400).json({
      success: false,
      error: "Use /api/chatbot/stream/:id for live replies.",
    });
  } catch (err) {
    console.error("❌ sendPublicMessage Error:", err);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};
