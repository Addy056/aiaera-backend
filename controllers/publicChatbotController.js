import { supabase } from "../config/supabaseClient.js";

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

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Chatbot ID is required",
      });
    }

    console.log("✅ Public chatbot request for ID:", id);

    /* ----------------------------------------------
     * Load chatbot (STRICT)
     * ---------------------------------------------- */
    const { data: bot, error: botErr } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", id)
      .single(); // ✅ STRICT lookup

    if (botErr) {
      console.error("❌ Supabase chatbot fetch error:", botErr);
      return res.status(404).json({
        success: false,
        error: "Chatbot not found",
      });
    }

    if (!bot) {
      return res.status(404).json({
        success: false,
        error: "Chatbot not found",
      });
    }

    /* ----------------------------------------------
     * Parse config safely
     * ---------------------------------------------- */
    let cfg = {};
    try {
      cfg =
        typeof bot.config === "string"
          ? JSON.parse(bot.config)
          : bot.config || {};
    } catch (e) {
      console.warn("⚠️ Invalid chatbot config JSON");
      cfg = {};
    }

    /* ----------------------------------------------
     * Load Integrations
     * ---------------------------------------------- */
    const { data: integ, error: integErr } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", bot.user_id)
      .maybeSingle();

    if (integErr) {
      console.warn("⚠️ Integration fetch error:", integErr.message);
    }

    /* ----------------------------------------------
     * Load File Data (parsed text)
     * ---------------------------------------------- */
    let allFileText = "";

    const { data: parsedFiles, error: fileErr } = await supabase
      .from("chatbot_file_data")
      .select("content")
      .eq("chatbot_id", id);

    if (fileErr) {
      console.warn("⚠️ File data fetch error:", fileErr.message);
    }

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
     * Final normalized response
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

    console.log("✅ Public chatbot loaded:", bot.id);

    return res.json({
      success: true,
      data: response,
    });
  } catch (err) {
    console.error("❌ publicChatbotController Fatal Error:", err);
    return res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

/* -------------------------------------------------------
 * 2) PUBLIC MESSAGE (fallback — optional)
 * ------------------------------------------------------- */
export const sendPublicMessage = async (req, res) => {
  try {
    return res.status(400).json({
      success: false,
      error: "Use /api/chatbot/stream/:id for live replies.",
    });
  } catch (err) {
    console.error("❌ sendPublicMessage Error:", err);
    return res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};
