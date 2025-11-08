// backend/controllers/chatbotController.js
import supabase from "../config/supabaseClient.js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ----------------------
// Helpers
// ----------------------
const isValidUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

/**
 * Safely parse JSON-like config objects
 */
const safeParseConfig = (cfg) => {
  if (!cfg) return {};
  try {
    return typeof cfg === "string" ? JSON.parse(cfg) : { ...cfg };
  } catch {
    return {};
  }
};

/**
 * Build a neutral assistant system prompt with short helpful prompts.
 * Skips any missing fields gracefully.
 */
const buildAssistantSystemPrompt = (ctx) => {
  const lines = [
    `You are a friendly, neutral AI assistant for this business. You help website visitors and customers.`,
    `Always be concise, factual, and clear. If helpful, add ONE short follow-up prompt at the end (e.g., "Would you like the booking link?" or "Want directions?").`,
    ``,
    `--- Business Context ---`,
    `Business Name: ${ctx.name || "Not provided"}`,
    `Business Description: ${ctx.business_info || "Not provided"}`,
  ];

  if (ctx.website_url) lines.push(`Website: ${ctx.website_url}`);
  if (ctx.business_address) lines.push(`Address: ${ctx.business_address}`);

  if (ctx.location?.latitude && ctx.location?.longitude) {
    lines.push(
      `Location: ${ctx.location.latitude}, ${ctx.location.longitude}${
        ctx.location.googleMapsLink ? ` (${ctx.location.googleMapsLink})` : ""
      }`
    );
  }

  if (ctx.calendly_link) lines.push(`Calendly: ${ctx.calendly_link}`);

  if (ctx.filesText) {
    lines.push(``, `--- Reference Files ---`, ctx.filesText);
  }

  lines.push(
    ``,
    `--- Guidelines ---`,
    `- Speak as the assistant for the business (not as the business owner).`,
    `- If user asks about booking and Calendly is available, include the link.`,
    `- If user asks about location and address/coords exist, include them.`,
    `- If the user asks product/service questions, use the description/files.`,
    `- Do not say "you haven't provided info". If info is missing, answer generally and offer help.`,
    `- Keep answers short; include one short helpful follow-up prompt when useful.`
  );

  return lines.join("\n");
};

/**
 * Fetch file contents from chatbot_file_data by file IDs for a user
 */
const fetchFilesText = async (userId, fileIds) => {
  if (!userId || !Array.isArray(fileIds) || fileIds.length === 0) return "";
  const { data: fileData, error } = await supabase
    .from("chatbot_file_data")
    .select("content")
    .in("file_id", fileIds)
    .eq("user_id", userId);

  if (error || !fileData?.length) return "";
  const contents = fileData.map((f) => f.content).filter(Boolean);
  return contents.length ? contents.join("\n---\n") : "";
};

/**
 * Map frontend messages to Groq format safely
 */
const mapToGroqMessages = (systemPrompt, messages) => {
  const userAssistant = (m) => {
    const role = m.role
      ? m.role
      : m.sender === "user"
      ? "user"
      : "assistant";
    return { role, content: m.content || m.text || "" };
  };

  return [
    { role: "system", content: systemPrompt },
    ...messages.filter(Boolean).map(userAssistant),
  ];
};

// ----------------------
// CRUD (unchanged)
// ----------------------
const shapeChatbotPayload = (body = {}) => {
  const safeConfig =
    body.config && typeof body.config === "object"
      ? JSON.parse(JSON.stringify(body.config))
      : {};

  return {
    name: typeof body.name === "string" ? body.name.trim() : null,
    business_info:
      typeof body.business_info === "string" ? body.business_info.trim() : null,
    config: safeConfig,
    updated_at: new Date().toISOString(),
  };
};

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

export const retrainChatbot = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { chatbotId, businessInfo, files, websiteUrl, latitude, longitude } = req.body;

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

    let currentConfig = safeParseConfig(chatbot.config);

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
          (latitude ?? integrations?.business_lat) != null &&
          (longitude ?? integrations?.business_lng) != null
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
    const incomingConfig =
      typeof req.body.chatbotConfig === "object" ? req.body.chatbotConfig : {};

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Try to enrich from DB if business_info/name missing
    const { data: chatbotRow } = await supabase
      .from("chatbots")
      .select("id, name, business_info, config")
      .eq("user_id", userId)
      .maybeSingle();

    const dbConfig = safeParseConfig(chatbotRow?.config);

    // Pull integrations
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("business_address, business_lat, business_lng, calendly_link")
      .eq("user_id", userId)
      .maybeSingle();

    // Merge context (prefer incoming, fallback to DB)
    const merged = {
      name: incomingConfig.name || chatbotRow?.name || "Business",
      business_info:
        incomingConfig.business_info ||
        chatbotRow?.business_info ||
        "This business provides helpful services and products to its customers.",
      website_url: incomingConfig.website_url || dbConfig.website_url || null,
      business_address:
        incomingConfig.business_address || dbConfig.business_address || integrations?.business_address || null,
      calendly_link:
        incomingConfig.integrations?.calendly ||
        incomingConfig.calendly_link ||
        dbConfig.calendly_link ||
        integrations?.calendly_link ||
        null,
      location: {
        latitude:
          incomingConfig.location?.latitude ??
          dbConfig?.location?.latitude ??
          integrations?.business_lat ??
          null,
        longitude:
          incomingConfig.location?.longitude ??
          dbConfig?.location?.longitude ??
          integrations?.business_lng ??
          null,
        googleMapsLink: null, // computed below
      },
      files: Array.isArray(incomingConfig.files)
        ? incomingConfig.files
        : Array.isArray(dbConfig.files)
        ? dbConfig.files
        : [],
    };

    if (merged.location.latitude != null && merged.location.longitude != null) {
      merged.location.googleMapsLink = `https://www.google.com/maps?q=${merged.location.latitude},${merged.location.longitude}`;
    }

    // Reference file content (best-effort)
    const filesText = await fetchFilesText(userId, merged.files);
    const systemPrompt = buildAssistantSystemPrompt({
      ...merged,
      filesText: filesText || undefined,
    });

    const groqMessages = mapToGroqMessages(systemPrompt, messages);

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "Sorry, I couldn’t generate a response.";

    return res.json({ success: true, reply, chatbotConfig: merged });
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

    // Pull chatbot + user_id so we can fetch integrations
    const { data: chatbot, error: botErr } = await supabase
      .from("chatbots")
      .select("id, user_id, name, business_info, config")
      .eq("id", id)
      .single();

    if (botErr || !chatbot)
      return res.status(404).json({ success: false, error: "Chatbot not found" });

    const cfg = safeParseConfig(chatbot.config);

    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("business_address, business_lat, business_lng, calendly_link")
      .eq("user_id", chatbot.user_id)
      .maybeSingle();

    const merged = {
      name: chatbot.name || "Business",
      business_info:
        chatbot.business_info ||
        "This business provides helpful services and products to its customers.",
      website_url: cfg.website_url || null,
      business_address: cfg.business_address || integrations?.business_address || null,
      calendly_link: cfg.calendly_link || integrations?.calendly_link || null,
      location: {
        latitude: cfg?.location?.latitude ?? integrations?.business_lat ?? null,
        longitude: cfg?.location?.longitude ?? integrations?.business_lng ?? null,
        googleMapsLink: null,
      },
      files: Array.isArray(cfg.files) ? cfg.files : [],
    };

    if (merged.location.latitude != null && merged.location.longitude != null) {
      merged.location.googleMapsLink = `https://www.google.com/maps?q=${merged.location.latitude},${merged.location.longitude}`;
    }

    const filesText = await fetchFilesText(chatbot.user_id, merged.files);
    const systemPrompt = buildAssistantSystemPrompt({
      ...merged,
      filesText: filesText || undefined,
    });

    const groqMessages = mapToGroqMessages(systemPrompt, messages);

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
