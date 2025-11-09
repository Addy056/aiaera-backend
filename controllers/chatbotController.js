// backend/controllers/chatbotController.js
import supabase from "../config/supabaseClient.js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ------------------------------
   Helper functions
------------------------------ */
const isValidUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );

const safeParseConfig = (cfg) => {
  try {
    return typeof cfg === "string" ? JSON.parse(cfg) : cfg || {};
  } catch {
    return {};
  }
};

const fetchFilesText = async (userId, fileIds) => {
  if (!userId || !Array.isArray(fileIds) || fileIds.length === 0) return "";
  const { data, error } = await supabase
    .from("chatbot_file_data")
    .select("content")
    .in("file_id", fileIds)
    .eq("user_id", userId);
  if (error) {
    console.warn("[fetchFilesText] supabase error:", error.message || error);
    return "";
  }
  if (!data?.length) return "";
  return data.map((f) => f.content).filter(Boolean).join("\n---\n");
};

/**
 * Normalize business info field presence:
 * prefer business_info, then business_description, then businessInfo
 */
const pickBusinessInfo = (obj = {}) =>
  obj?.business_info ?? obj?.business_description ?? obj?.businessInfo ?? null;

/**
 * Build assistant system prompt.
 * Important: don't insert "Not provided" which primes the assistant to ask for info.
 * If description is absent, either omit that line or include a short neutral line.
 */
const buildAssistantSystemPrompt = (ctx) => {
  const lines = [
    `You are a friendly, neutral AI assistant representing this business.`,
    `Use only the business information provided below to answer customer questions.`,
    `Do NOT volunteer addresses, links, or booking details unless the customer asks for them.`,
    ``,
    `--- BUSINESS INFO ---`,
    `Business Name: ${ctx.name || "Unknown business"}`,
  ];

  // Only include a business description if present; otherwise include a short neutral hint.
  if (ctx.business_info) {
    lines.push(`Business Description: ${ctx.business_info}`);
  } else if (ctx.filesText) {
    // If files were provided but no short description, prefer the files as source.
    lines.push(
      `Business Description: (Use the reference files below for details about products/services.)`
    );
  } else {
    // Neutral fallback that does NOT invite the assistant to ask the user for more info.
    lines.push(
      `Business Description: This business serves customers with products and services relevant to the customer's queries.`
    );
  }

  if (ctx.business_address)
    lines.push(
      `Address: ${ctx.business_address} (mention only if asked about location)`
    );

  if (ctx.location?.latitude && ctx.location?.longitude) {
    lines.push(
      `Coordinates: ${ctx.location.latitude}, ${ctx.location.longitude} (use only if location asked)`
    );
  }

  // Calendly / website are explicitly hidden unless requested
  if (ctx.website_url)
    lines.push(
      `Website Link (show ONLY if user asks about website, visit, or online presence): ${ctx.website_url}`
    );
  if (ctx.calendly_link)
    lines.push(
      `Calendly Link (show ONLY if user asks to book, schedule, or set appointment): ${ctx.calendly_link}`
    );

  if (ctx.filesText) lines.push(`\n--- Reference Files ---\n${ctx.filesText}`);

  lines.push(
    ``,
    `--- GUIDELINES ---`,
    `- Keep responses short, natural, and accurate.`,
    `- Speak as the assistant of the business, not the owner.`,
    `- If a user asks for the website, then provide the link.`,
    `- If a user asks for booking/scheduling, then show the Calendly link.`,
    `- If a user asks for location, include address or map link.`,
    `- Never say "you haven't provided info" or ask the user to provide their business description.`,
    `- Optionally end with a short helpful follow-up (e.g., "Would you like the booking link?").`
  );

  return lines.join("\n");
};

const mapToGroqMessages = (systemPrompt, messages) => [
  { role: "system", content: systemPrompt },
  ...messages.map((m) => ({
    role: m.role || (m.sender === "user" ? "user" : "assistant"),
    content: m.content || m.text || "",
  })),
];

/* ------------------------------
   CRUD
------------------------------ */
const shapeChatbotPayload = (body = {}) => ({
  name: typeof body.name === "string" ? body.name.trim() : null,
  business_info:
    typeof body.business_info === "string"
      ? body.business_info.trim()
      : typeof body.business_description === "string"
      ? body.business_description.trim()
      : null,
  config:
    body.config && typeof body.config === "object"
      ? JSON.parse(JSON.stringify(body.config))
      : {},
  updated_at: new Date().toISOString(),
});

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
    console.error("[createChatbot] error:", err);
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
    console.error("[getUserChatbots] error:", err);
    return res.status(500).json({ error: "Failed to fetch chatbots" });
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
    console.error("[updateChatbot] error:", err);
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
    console.error("[deleteChatbot] error:", err);
    return res.status(500).json({ error: "Failed to delete chatbot" });
  }
};

/* ------------------------------
   Retrain chatbot
------------------------------ */
export const retrainChatbot = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { chatbotId, businessInfo, files, websiteUrl, latitude, longitude } =
      req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!chatbotId || !isValidUUID(chatbotId))
      return res.status(400).json({ error: "Invalid chatbot ID" });

    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("config")
      .eq("id", chatbotId)
      .eq("user_id", userId)
      .single();

    const currentConfig = safeParseConfig(chatbot?.config);
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
          latitude && longitude
            ? `https://www.google.com/maps?q=${latitude},${longitude}`
            : null,
      },
      business_address: integrations?.business_address || null,
      calendly_link: integrations?.calendly_link || null,
    };

    await supabase
      .from("chatbots")
      .update({
        business_info: businessInfo || null,
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatbotId)
      .eq("user_id", userId);

    return res.json({
      success: true,
      message: "Chatbot retrained successfully",
      data: updatedConfig,
    });
  } catch (err) {
    console.error("[retrainChatbot] error:", err);
    return res.status(500).json({ error: "Failed to retrain chatbot" });
  }
};

/* ------------------------------
   Preview chatbot (Builder Preview)
------------------------------ */
export const previewChat = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const incoming = req.body.chatbotConfig || {};

    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const { data: chatbotRow, error: chatbotErr } = await supabase
      .from("chatbots")
      .select("name, business_info, business_description, config")
      .eq("user_id", userId)
      .maybeSingle();

    if (chatbotErr) {
      console.warn("[previewChat] failed to fetch chatbot row:", chatbotErr.message || chatbotErr);
    }

    const dbConfig = safeParseConfig(chatbotRow?.config);
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("business_address, business_lat, business_lng, calendly_link")
      .eq("user_id", userId)
      .maybeSingle();

    const merged = {
      name: incoming.name || chatbotRow?.name || "Business",
      business_info:
        incoming.business_info ??
        incoming.business_description ??
        pickBusinessInfo(chatbotRow) ??
        null,
      website_url: incoming.website_url || dbConfig.website_url || null,
      business_address:
        incoming.business_address ||
        dbConfig.business_address ||
        integrations?.business_address ||
        null,
      calendly_link:
        incoming.calendly_link ||
        dbConfig.calendly_link ||
        integrations?.calendly_link ||
        null,
      location: {
        latitude:
          incoming.location?.latitude ??
          dbConfig?.location?.latitude ??
          integrations?.business_lat ??
          null,
        longitude:
          incoming.location?.longitude ??
          dbConfig?.location?.longitude ??
          integrations?.business_lng ??
          null,
      },
      files:
        Array.isArray(incoming.files) && incoming.files.length
          ? incoming.files
          : Array.isArray(dbConfig.files)
          ? dbConfig.files
          : [],
    };

    const filesText = await fetchFilesText(userId, merged.files);
    const systemPrompt = buildAssistantSystemPrompt({
      ...merged,
      filesText: filesText || undefined,
    });

    const groqMessages = mapToGroqMessages(systemPrompt, messages);

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: groqMessages,
      });
    } catch (gErr) {
      console.error("[previewChat] groq error:", gErr);
      return res.status(500).json({ success: false, error: "AI generation failed" });
    }

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "I'm here to help with information about this business.";

    return res.json({ success: true, reply, chatbotConfig: merged });
  } catch (err) {
    console.error("[previewChat] error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to generate preview reply",
    });
  }
};

/* ------------------------------
   Public chatbot (Widget)
------------------------------ */
export const publicChatbot = async (req, res) => {
  try {
    const { id } = req.params;
    const { messages = [] } = req.body;
    if (!id || !Array.isArray(messages))
      return res.status(400).json({ success: false, error: "Invalid input" });

    const { data: chatbot, error: chatbotErr } = await supabase
      .from("chatbots")
      .select("user_id, name, business_info, business_description, config")
      .eq("id", id)
      .single();

    if (chatbotErr || !chatbot) {
      console.warn("[publicChatbot] failed to fetch chatbot:", chatbotErr);
      return res.status(404).json({ success: false, error: "Chatbot not found" });
    }

    const cfg = safeParseConfig(chatbot?.config);
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("business_address, business_lat, business_lng, calendly_link")
      .eq("user_id", chatbot.user_id)
      .maybeSingle();

    const merged = {
      name: chatbot.name || "Business",
      business_info: pickBusinessInfo(chatbot) ?? null,
      website_url: cfg.website_url || null,
      business_address: cfg.business_address || integrations?.business_address || null,
      calendly_link: cfg.calendly_link || integrations?.calendly_link || null,
      location: {
        latitude: cfg?.location?.latitude ?? integrations?.business_lat ?? null,
        longitude: cfg?.location?.longitude ?? integrations?.business_lng ?? null,
      },
      files: Array.isArray(cfg.files) ? cfg.files : [],
    };

    const filesText = await fetchFilesText(chatbot.user_id, merged.files);
    const systemPrompt = buildAssistantSystemPrompt({
      ...merged,
      filesText: filesText || undefined,
    });

    const groqMessages = mapToGroqMessages(systemPrompt, messages);

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: groqMessages,
      });
    } catch (gErr) {
      console.error("[publicChatbot] groq error:", gErr);
      return res.status(500).json({ success: false, error: "AI generation failed" });
    }

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "I'm your virtual assistant here to help with business information.";

    return res.json({ success: true, reply });
  } catch (err) {
    console.error("[publicChatbot] error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
