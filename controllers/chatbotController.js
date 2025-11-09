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

const pickBusinessInfo = (obj = {}) =>
  obj?.business_info ??
  obj?.business_description ??
  obj?.businessInfo ??
  null;

/* ------------------------------
   Build business assistant prompt
------------------------------ */
const buildAssistantSystemPrompt = (ctx) => {
  const lines = [
    `You are an AI assistant that speaks on behalf of this business.`,
    `You represent the company directly to customers visiting their website or social pages.`,
    `You should always answer as "we" or "our business", not "I" or "you".`,
    `Use only the provided business information below.`,
    ``,
    `--- BUSINESS DETAILS ---`,
    `Business Name: ${ctx.name || "This business"}`,
  ];

  // Business description: always assume there is something to say
  if (ctx.business_info && ctx.business_info.trim().length > 0) {
    lines.push(`Business Description: ${ctx.business_info}`);
  } else if (ctx.filesText) {
    lines.push(
      `Business Description: Use the following file data to understand what this business does.`
    );
  } else {
    lines.push(
      `Business Description: This business provides helpful products or services for its customers.`
    );
  }

  if (ctx.business_address)
    lines.push(
      `Address (only mention if asked): ${ctx.business_address}`
    );

  if (ctx.location?.latitude && ctx.location?.longitude)
    lines.push(
      `Coordinates (only mention if asked about location): ${ctx.location.latitude}, ${ctx.location.longitude}`
    );

  // Hide links unless requested
  if (ctx.website_url)
    lines.push(
      `Website Link (share ONLY if the user asks about the website or visiting): ${ctx.website_url}`
    );

  if (ctx.calendly_link)
    lines.push(
      `Calendly Link (share ONLY if the user asks to book, schedule, or meet): ${ctx.calendly_link}`
    );

  if (ctx.filesText)
    lines.push(`\n--- REFERENCE FILES ---\n${ctx.filesText}`);

  lines.push(
    ``,
    `--- RESPONSE STYLE ---`,
    `- Always speak as the business itself ("we", "our", "our team").`,
    `- Never say "I don’t have that information" or "you haven’t provided anything".`,
    `- If something is missing, reply generally but positively.`,
    `- Keep answers short, clear, and professional.`,
    `- Only mention Calendly, website, or address when the customer explicitly asks.`,
    `- You are NOT AIAERA; you are the business chatbot representing the user’s company.`
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
    res.status(201).json({ chatbot: data });
  } catch (err) {
    console.error("[createChatbot] error:", err);
    res.status(500).json({ error: "Failed to create chatbot" });
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
    res.json({ chatbots: data || [] });
  } catch (err) {
    console.error("[getUserChatbots] error:", err);
    res.status(500).json({ error: "Failed to fetch chatbots" });
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

    res.json({ chatbot: data });
  } catch (err) {
    console.error("[updateChatbot] error:", err);
    res.status(500).json({ error: "Failed to update chatbot" });
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
    res.json({ success: true, message: "Chatbot deleted" });
  } catch (err) {
    console.error("[deleteChatbot] error:", err);
    res.status(500).json({ error: "Failed to delete chatbot" });
  }
};

/* ------------------------------
   Retrain Chatbot
------------------------------ */
export const retrainChatbot = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { chatbotId, businessInfo, files, websiteUrl, latitude, longitude } = req.body;

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

    res.json({
      success: true,
      message: "Chatbot retrained successfully",
      data: updatedConfig,
    });
  } catch (err) {
    console.error("[retrainChatbot] error:", err);
    res.status(500).json({ error: "Failed to retrain chatbot" });
  }
};

/* ------------------------------
   Preview Chatbot (Builder Preview)
------------------------------ */
export const previewChat = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const incoming = req.body.chatbotConfig || {};

    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const { data: chatbotRow } = await supabase
      .from("chatbots")
      .select("name, business_info, config")
      .eq("user_id", userId)
      .maybeSingle();

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
        chatbotRow?.business_info ??
        "This business provides useful services to customers.",
      website_url: incoming.website_url || dbConfig.website_url || null,
      business_address:
        incoming.business_address || integrations?.business_address || null,
      calendly_link:
        incoming.calendly_link || integrations?.calendly_link || null,
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
      files: Array.isArray(incoming.files)
        ? incoming.files
        : Array.isArray(dbConfig.files)
        ? dbConfig.files
        : [],
    };

    const filesText = await fetchFilesText(userId, merged.files);
    const systemPrompt = buildAssistantSystemPrompt({ ...merged, filesText });
    const groqMessages = mapToGroqMessages(systemPrompt, messages);

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "We are here to help with our products and services.";

    res.json({ success: true, reply, chatbotConfig: merged });
  } catch (err) {
    console.error("[previewChat] error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to generate preview reply" });
  }
};

/* ------------------------------
   Public Chatbot (Widget)
------------------------------ */
export const publicChatbot = async (req, res) => {
  try {
    const { id } = req.params;
    const { messages = [] } = req.body;

    if (!id || !Array.isArray(messages))
      return res.status(400).json({ success: false, error: "Invalid input" });

    const { data: chatbot, error: chatbotErr } = await supabase
      .from("chatbots")
      .select("user_id, name, business_info, config")
      .eq("id", id)
      .single();

    if (chatbotErr || !chatbot)
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
        "This business provides helpful products and services to customers.",
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
    const systemPrompt = buildAssistantSystemPrompt({ ...merged, filesText });
    const groqMessages = mapToGroqMessages(systemPrompt, messages);

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "We’re happy to help with any questions about our business.";

    res.json({ success: true, reply });
  } catch (err) {
    console.error("[publicChatbot] error:", err);
    res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};
