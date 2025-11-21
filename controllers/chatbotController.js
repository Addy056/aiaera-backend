import supabase from "../config/supabaseClient.js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ------------------------------
   HELPERS
------------------------------ */
const isValidUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );

const safeParseConfig = (cfg = {}) => {
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
    console.warn("[fetchFilesText] supabase error:", error.message);
    return "";
  }

  return (data || [])
    .map((f) => f.content)
    .filter(Boolean)
    .join("\n---\n");
};

/* ------------------------------
   PROMPT BUILDER
------------------------------ */
const buildAssistantSystemPrompt = (ctx) => {
  const lines = [
    `You are a conversational AI assistant representing this business.`,
    `Always speak as "we" or "our business", never "I".`,
    `Only use the following information to answer.`,
    ``,
    `--- BUSINESS DETAILS ---`,
    `Business Name: ${ctx.name || "Our Business"}`,
  ];

  // Business description logic
  if (ctx.business_info?.trim()) {
    lines.push(`Business Description: ${ctx.business_info}`);
  } else if (ctx.filesText?.length > 0) {
    lines.push(
      `Business Description: Use the reference file data to inform your answers.`
    );
  } else {
    lines.push(`Business Description: We help customers with our products and services.`);
  }

  if (ctx.business_address)
    lines.push(`Address (ONLY mention if user asks): ${ctx.business_address}`);

  // Google Maps link
  if (ctx.location?.latitude && ctx.location?.longitude) {
    const mapLink = `https://www.google.com/maps?q=${ctx.location.latitude},${ctx.location.longitude}`;
    lines.push(`Map Link (ONLY if user asks for directions): ${mapLink}`);
  }

  if (ctx.website_url)
    lines.push(`Website (ONLY mention if asked): ${ctx.website_url}`);

  if (ctx.calendly_link)
    lines.push(`Calendly Scheduler (ONLY mention if asked): ${ctx.calendly_link}`);

  if (ctx.filesText?.length > 0)
    lines.push(`\n--- REFERENCE FILES ---\n${ctx.filesText}`);

  lines.push(
    ``,
    `--- STYLE RULES ---`,
    `- Speak in a friendly, helpful tone.`,
    `- Never say "I don't have information".`,
    `- Provide general useful info when exact details missing.`,
    `- Respond clearly and concisely.`,
    `- Do NOT mention AIAERA; you speak AS the business.`
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
   CONFIG NORMALIZER
------------------------------ */
const normalizeChatbotConfig = (chatbot, integrations) => {
  const cfg = safeParseConfig(chatbot?.config);

  return {
    id: chatbot.id,
    name: chatbot.name || "Our Business",

    business_info:
      chatbot.business_info ||
      cfg.business_info ||
      cfg.businessDescription ||
      "We help customers with our services.",

    welcome_message: cfg.welcome_message || "Hello! How can we assist you today?",

    website_url: cfg.website_url || cfg.businessWebsite || null,

    business_address: cfg.business_address || integrations?.business_address || null,

    calendly_link: cfg.calendly_link || integrations?.calendly_link || null,

    location: {
      latitude:
        integrations?.business_lat ?? cfg?.location?.latitude ?? null,
      longitude:
        integrations?.business_lng ?? cfg?.location?.longitude ?? null,
    },

    files: Array.isArray(cfg.files) ? cfg.files : [],
    logo_url: cfg.logo_url || null,
    themeColors: cfg.themeColors || null,
  };
};

/* ------------------------------
   CREATE CHATBOT
------------------------------ */
export const createChatbot = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const payload = {
      name: req.body.name || null,
      business_info:
        req.body.business_info ||
        req.body.business_description ||
        null,
      config: req.body.config || {},
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("chatbots")
      .insert([{ user_id: userId, ...payload }])
      .select("*")
      .single();

    if (error) throw error;

    res.json({ chatbot: data });
  } catch (err) {
    console.error("createChatbot error:", err);
    res.status(500).json({ error: "Failed to create chatbot" });
  }
};

/* ------------------------------
   UPDATE CHATBOT
------------------------------ */
export const updateChatbot = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!isValidUUID(id))
      return res.status(400).json({ error: "Invalid ID" });

    const payload = {
      name: req.body.name || null,
      business_info:
        req.body.business_info ||
        req.body.business_description ||
        null,
      config: req.body.config || {},
      updated_at: new Date().toISOString(),
    };

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
    console.error("updateChatbot error:", err);
    res.status(500).json({ error: "Failed to update chatbot" });
  }
};

/* ------------------------------
   DELETE CHATBOT  (ADDED)
------------------------------ */
export const deleteChatbot = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!isValidUUID(id))
      return res.status(400).json({ error: "Invalid ID" });

    const { error } = await supabase
      .from("chatbots")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    return res.json({
      success: true,
      message: "Chatbot deleted successfully",
    });
  } catch (err) {
    console.error("deleteChatbot error:", err);
    res.status(500).json({ error: "Failed to delete chatbot" });
  }
};

/* ------------------------------
   PUBLIC GET (for iframe)
------------------------------ */
export const getPublicChatbotConfig = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id))
      return res.status(400).json({ error: "Invalid ID" });

    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", id)
      .single();

    if (!chatbot)
      return res.status(404).json({ error: "Chatbot not found" });

    const { data: integ } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", chatbot.user_id)
      .maybeSingle();

    const merged = normalizeChatbotConfig(chatbot, integ);

    res.json(merged);
  } catch (err) {
    console.error("getPublicChatbotConfig error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ------------------------------
   PUBLIC CHATBOT MESSAGE
------------------------------ */
export const publicChatbot = async (req, res) => {
  try {
    const { id } = req.params;
    const { messages = [] } = req.body;

    if (!isValidUUID(id))
      return res
        .status(400)
        .json({ success: false, error: "Invalid chatbot ID" });

    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", id)
      .single();

    if (!chatbot)
      return res
        .status(404)
        .json({ success: false, error: "Chatbot not found" });

    const { data: integ } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", chatbot.user_id)
      .maybeSingle();

    const merged = normalizeChatbotConfig(chatbot, integ);

    const filesText = await fetchFilesText(chatbot.user_id, merged.files);

    const systemPrompt = buildAssistantSystemPrompt({
      ...merged,
      filesText,
    });

    const groqMessages = mapToGroqMessages(systemPrompt, messages);

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      merged.welcome_message ||
      "Hello! How can we help you today?";

    res.json({ success: true, reply });
  } catch (err) {
    console.error("publicChatbot error:", err);
    res.json({
      success: false,
      error: "Internal server error",
    });
  }
};
