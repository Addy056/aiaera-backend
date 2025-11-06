// backend/controllers/chatbotController.js
import supabase from "../config/supabaseClient.js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Supported languages
const SUPPORTED_LANGUAGES = ["en", "es", "fr", "de", "hi"];

// ----------------------
// Normalize and whitelist fields
// ----------------------
const shapeChatbotPayload = (body = {}) => {
  const safeConfig =
    body.config && typeof body.config === "object"
      ? JSON.parse(JSON.stringify(body.config)) // sanitize
      : {};

  const language =
    typeof body.language === "string" &&
    SUPPORTED_LANGUAGES.includes(body.language.toLowerCase())
      ? body.language.toLowerCase()
      : "en"; // fallback

  return {
    name: typeof body.name === "string" ? body.name.trim() : null,
    business_info:
      typeof body.business_info === "string"
        ? body.business_info.trim()
        : null,
    config: safeConfig,
    language,
    updated_at: new Date().toISOString(),
  };
};

// ----------------------
// UUID validation
// ----------------------
const isValidUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );

// ----------------------
// Create chatbot
// ----------------------
export const createChatbot = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const payload = shapeChatbotPayload(req.body);

    const { data, error } = await supabase
      .from("chatbots")
      .insert([{ user_id: userId, ...payload }])
      .select("*")
      .single();

    if (error) throw error;

    return res.status(201).json({ chatbot: data });
  } catch (err) {
    console.error("[createChatbot] error:", err.message || err);
    return res.status(500).json({ error: "Failed to create chatbot" });
  }
};

// ----------------------
// Get all user chatbots
// ----------------------
export const getUserChatbots = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { data, error } = await supabase
      .from("chatbots")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ chatbots: data || [] });
  } catch (err) {
    console.error("[getUserChatbots] error:", err.message || err);
    return res.status(500).json({ error: "Failed to fetch chatbots" });
  }
};

// ----------------------
// Get chatbot by ID
// ----------------------
export const getChatbotById = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!id || !isValidUUID(id))
      return res.status(400).json({ error: "Invalid chatbot ID" });

    const { data, error } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Chatbot not found" });

    return res.json({ chatbot: data });
  } catch (err) {
    console.error("[getChatbotById] error:", err.message || err);
    return res.status(500).json({ error: "Failed to fetch chatbot" });
  }
};

// ----------------------
// Update chatbot
// ----------------------
export const updateChatbot = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!id || !isValidUUID(id))
      return res.status(400).json({ error: "Invalid chatbot ID" });

    const payload = shapeChatbotPayload(req.body);

    const { data, error } = await supabase
      .from("chatbots")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Chatbot not found" });

    return res.json({ chatbot: data });
  } catch (err) {
    console.error("[updateChatbot] error:", err.message || err);
    return res.status(500).json({ error: "Failed to update chatbot" });
  }
};

// ----------------------
// Delete chatbot
// ----------------------
export const deleteChatbot = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!id || !isValidUUID(id))
      return res.status(400).json({ error: "Invalid chatbot ID" });

    const { error } = await supabase
      .from("chatbots")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    return res.json({ success: true, message: "Chatbot deleted" });
  } catch (err) {
    console.error("[deleteChatbot] error:", err.message || err);
    return res.status(500).json({ error: "Failed to delete chatbot" });
  }
};

// ----------------------
// Retrain chatbot
// ----------------------
export const retrainChatbot = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { chatbotId, businessInfo, files, websiteUrl, latitude, longitude } =
      req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!chatbotId || !isValidUUID(chatbotId))
      return res.status(400).json({ error: "Invalid chatbot ID" });

    const { data: chatbot, error: fetchError } = await supabase
      .from("chatbots")
      .select("config")
      .eq("id", chatbotId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !chatbot)
      return res.status(404).json({ error: "Chatbot not found" });

    let currentConfig = {};
    try {
      currentConfig =
        typeof chatbot.config === "string"
          ? JSON.parse(chatbot.config)
          : chatbot.config || {};
    } catch {
      currentConfig = {};
    }

    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("business_address, business_lat, business_lng, calendly_link")
      .eq("user_id", userId)
      .maybeSingle();

    const updatedConfig = {
      ...currentConfig,
      files: Array.isArray(files) ? files : currentConfig.files || [],
      website_url: websiteUrl || currentConfig.website_url || null,
      location: {
        latitude: latitude ?? integrations?.business_lat ?? null,
        longitude: longitude ?? integrations?.business_lng ?? null,
        googleMapsLink:
          latitude || integrations?.business_lat
            ? `https://www.google.com/maps?q=${
                latitude ?? integrations?.business_lat
              },${longitude ?? integrations?.business_lng}`
            : null,
      },
      business_address: integrations?.business_address || null,
      calendly_link: integrations?.calendly_link || null,
    };

    const { error } = await supabase
      .from("chatbots")
      .update({
        business_info: businessInfo || null,
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatbotId)
      .eq("user_id", userId);

    if (error) throw error;

    return res.json({
      success: true,
      message: "Chatbot retrained successfully",
      data: updatedConfig,
    });
  } catch (err) {
    console.error("[retrainChatbot] error:", err.message || err);
    return res.status(500).json({ error: "Failed to retrain chatbot" });
  }
};

// ----------------------
// Preview chatbot (Builder preview)
// ----------------------
export const previewChat = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const chatbotConfig =
      typeof req.body.chatbotConfig === "object" ? req.body.chatbotConfig : {};

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { data: integrations, error: intError } = await supabase
      .from("user_integrations")
      .select("business_address, business_lat, business_lng, calendly_link")
      .eq("user_id", userId)
      .maybeSingle();

    if (intError) console.error("[previewChat] integrations error:", intError);

    const safeConfig = {
      business_info: chatbotConfig.business_info || "A helpful business assistant.",
      files: Array.isArray(chatbotConfig.files) ? chatbotConfig.files : [],
      website_url: chatbotConfig.website_url || null,
      location: {
        latitude: chatbotConfig.location?.latitude || integrations?.business_lat || null,
        longitude: chatbotConfig.location?.longitude || integrations?.business_lng || null,
        googleMapsLink:
          (chatbotConfig.location?.latitude || integrations?.business_lat) &&
          (chatbotConfig.location?.longitude || integrations?.business_lng)
            ? `https://www.google.com/maps?q=${
                chatbotConfig.location?.latitude ?? integrations?.business_lat
              },${chatbotConfig.location?.longitude ?? integrations?.business_lng}`
            : null,
      },
      business_address: integrations?.business_address || null,
      calendly_link: integrations?.calendly_link || null,
    };

    let fileContents = [];
    if (safeConfig.files.length > 0) {
      const { data: fileData } = await supabase
        .from("chatbot_file_data")
        .select("content")
        .in("file_id", safeConfig.files)
        .eq("user_id", userId);

      if (fileData?.length) fileContents = fileData.map((f) => f.content);
    }

    const filesText = fileContents.length
      ? `\n\nFiles Content:\n${fileContents.join("\n---\n")}`
      : "";

    const systemPrompt = `
You are an AI assistant for this business.
Business Info: ${safeConfig.business_info}
Website: ${safeConfig.website_url || "Not provided"}
Business Address: ${safeConfig.business_address || "Not provided"}
Google Maps: ${safeConfig.location.googleMapsLink || "Not provided"}
Calendly: ${safeConfig.calendly_link || "Not provided"}
${filesText}
`;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role || (m.sender === "user" ? "user" : "assistant"),
        content: m.content || m.text,
      })),
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "Sorry, I couldn’t generate a response.";

    return res.json({ success: true, reply, chatbotConfig: safeConfig });
  } catch (err) {
    console.error("[previewChat] error:", err.message || err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to generate preview reply" });
  }
};

// ----------------------
// Public chatbot (for embedded widget)
// ----------------------
export const publicChatbot = async (req, res) => {
  try {
    const { id } = req.params;
    const { messages = [] } = req.body;

    if (!id || !Array.isArray(messages))
      return res
        .status(400)
        .json({ success: false, error: "Missing chatbot ID or messages" });

    const { data: chatbot, error } = await supabase
      .from("chatbots")
      .select("business_info, config")
      .eq("id", id)
      .single();

    if (error || !chatbot)
      return res.status(404).json({ success: false, error: "Chatbot not found" });

    let safeConfig = {};
    try {
      safeConfig =
        typeof chatbot.config === "string"
          ? JSON.parse(chatbot.config)
          : chatbot.config || {};
    } catch {
      safeConfig = {};
    }

    const combinedConfig = {
      business_info: chatbot.business_info || "A helpful business assistant.",
      website_url: safeConfig.website_url || null,
      business_address: safeConfig.business_address || null,
      calendly_link: safeConfig.calendly_link || null,
    };

    const systemPrompt = `
You are an AI assistant for this business.
Business Info: ${combinedConfig.business_info}
Website: ${combinedConfig.website_url || "Not provided"}
Business Address: ${combinedConfig.business_address || "Not provided"}
Calendly Link: ${combinedConfig.calendly_link || "Not provided"}

Guidelines:
- Keep responses friendly and short.
- Include Calendly link if user asks to book meeting.
- Use address if asked for location.
`;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role || "user",
        content: m.content || "",
      })),
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "Sorry, I couldn’t generate a reply.";

    return res.json({ success: true, reply });
  } catch (err) {
    console.error("[publicChatbot] error:", err.message || err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};
