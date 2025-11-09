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

/**
 * Builds a safe assistant prompt — hides Calendly/website unless requested.
 */
const buildAssistantSystemPrompt = (ctx) => {
  const lines = [
    `You are a friendly, neutral AI assistant representing this business.`,
    `Use only the information below to answer questions accurately.`,
    `Never reveal private data or external links unless the customer explicitly asks.`,
    ``,
    `--- BUSINESS INFO ---`,
    `Business Name: ${ctx.name || "Unnamed business"}`,
  ];

  if (ctx.business_info) {
    lines.push(`Business Description: ${ctx.business_info}`);
  } else if (ctx.filesText) {
    lines.push(
      `Business Description: Use the following reference files to understand the business context.`
    );
  } else {
    lines.push(
      `Business Description: This business serves its customers with products or services relevant to their needs.`
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

  if (ctx.website_url)
    lines.push(
      `Website Link (share only if user asks about website or visiting): ${ctx.website_url}`
    );
  if (ctx.calendly_link)
    lines.push(
      `Calendly Link (share only if user asks to book, schedule, or set appointment): ${ctx.calendly_link}`
    );

  if (ctx.filesText)
    lines.push(`\n--- REFERENCE FILES ---\n${ctx.filesText}`);

  lines.push(
    ``,
    `--- GUIDELINES ---`,
    `- Keep responses short, natural, and professional.`,
    `- Speak as the assistant for the business, not the owner.`,
    `- If user asks for website → share website_url.`,
    `- If user asks for booking → share calendly_link.`,
    `- If user asks for location → share address/map.`,
    `- Never say “I don’t have business info.”`,
    `- End with a short follow-up prompt if relevant (e.g., "Would you like the booking link?").`
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

/* ------------------------------
   Retrain Chatbot
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
   Public Chatbot (Widget)
------------------------------ */
export const publicChatbot = async (req, res) => {
  try {
    const { id } = req.params;
    const { messages = [] } = req.body;

    if (!id || !Array.isArray(messages))
      return res.status(400).json({ success: false, error: "Invalid input" });

    // Fetch chatbot & latest info from DB
    const { data: chatbot, error: chatbotErr } = await supabase
      .from("chatbots")
      .select("user_id, name, business_info, business_description, config")
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

    // ✅ Always prefer latest business_info from DB
    const businessInfo =
      chatbot.business_info?.trim() ||
      chatbot.business_description?.trim() ||
      "This business provides helpful products and services to its customers.";

    const merged = {
      name: chatbot.name || "Business",
      business_info: businessInfo,
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

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "I'm your virtual assistant here to help with business information.";

    return res.json({ success: true, reply });
  } catch (err) {
    console.error("[publicChatbot] error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
