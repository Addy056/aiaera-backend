// backend/controllers/chatbotController.js
import supabase from "../config/supabaseClient.js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// UUID validator
const isUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );

// Safely parse JSON config
const parseConfig = (cfg) => {
  try {
    return typeof cfg === "string" ? JSON.parse(cfg) : cfg || {};
  } catch {
    return {};
  }
};

// Fetch file text from chatbot_file_data table
const fetchFilesText = async (userId, fileIds) => {
  if (!fileIds?.length) return "";

  const { data, error } = await supabase
    .from("chatbot_file_data")
    .select("content")
    .eq("user_id", userId)
    .in("file_id", fileIds);

  if (error) return "";

  return data.map((d) => d.content).join("\n---\n");
};

/* ---------------------------------------------------
   UPDATED INTENT DETECTION (MULTIPLE MEETING LINKS)
----------------------------------------------------*/
const detectIntent = async (userId, text) => {
  text = text.toLowerCase();

  // Keywords that indicate meeting scheduling
  const meetingKeywords = [
    "book",
    "meeting",
    "call",
    "schedule",
    "appointment",
    "talk",
    "zoom",
    "google meet",
    "meet link",
    "teams",
    "video call",
    "call with you",
  ];

  const locationKeywords = [
    "location",
    "address",
    "where are you",
    "map",
    "located",
    "office",
    "find you",
  ];

  const isMeeting = meetingKeywords.some((k) => text.includes(k));
  const isLocation = locationKeywords.some((k) => text.includes(k));

  /* ---------------------------
      📌 MEETING INTENT
  ----------------------------*/
  if (isMeeting) {
    const { data: integ } = await supabase
      .from("user_integrations")
      .select("meeting_links")
      .eq("user_id", userId)
      .maybeSingle();

    if (integ?.meeting_links && typeof integ.meeting_links === "object") {
      const { calendly, zoom, google_meet, teams, other } = integ.meeting_links;

      // Build a list of available meeting links
      const links = [];

      if (calendly) links.push(`• Calendly: ${calendly}`);
      if (google_meet) links.push(`• Google Meet: ${google_meet}`);
      if (zoom) links.push(`• Zoom: ${zoom}`);
      if (teams) links.push(`• Microsoft Teams: ${teams}`);
      if (other) links.push(`• Other: ${other}`);

      if (links.length > 0) {
        return {
          matched: true,
          reply:
            `Here are our available meeting options:\n\n` +
            links.join("\n"),
        };
      }
    }
  }

  /* ---------------------------
      📌 LOCATION INTENT
  ----------------------------*/
  if (isLocation) {
    const { data: business } = await supabase
      .from("business_data")
      .select("location_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (business?.location_url) {
      return {
        matched: true,
        reply: `You can find our location here:\n${business.location_url}`,
      };
    }
  }

  return { matched: false };
};

/* -----------------------------------------------
   Build system prompt
------------------------------------------------*/
const buildSystemPrompt = (data) => {
  return `
You are the official AI assistant of this business.

Business Name: ${data.name}
Business Info: ${data.business_info}

ONLY speak as “we” or “our business”. Never say “I”.

${
  data.filesText
    ? `Additional Reference Info:\n${data.filesText}`
    : ""
}

Rules:
- Do not mention AIAERA.
- Never say “I don’t have that info”.
- If unsure, give general helpful info.
- Friendly, helpful tone.
`;
};

// Map frontend → Groq format
const mapMessages = (systemPrompt, messages) => [
  { role: "system", content: systemPrompt },
  ...messages.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  })),
];

/* -----------------------------------------------
   PREVIEW CHAT (Builder)
------------------------------------------------*/
export const previewChat = async (req, res) => {
  try {
    const { messages, chatbotConfig, userId } = req.body;

    const lastUserMsg = messages[messages.length - 1]?.content || "";

    // 🔥 Intent detection (meeting / location)
    const intent = await detectIntent(userId, lastUserMsg);
    if (intent.matched) return res.json({ reply: intent.reply });

    const filesText = await fetchFilesText(
      userId,
      chatbotConfig.files || []
    );

    const systemPrompt = buildSystemPrompt({
      ...chatbotConfig,
      filesText,
    });

    const groqMsg = mapMessages(systemPrompt, messages);

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMsg,
    });

    return res.json({
      reply: response.choices[0].message?.content,
    });
  } catch (err) {
    console.error("previewChat error:", err);
    return res.status(500).json({ error: "Preview failed" });
  }
};

/* -----------------------------------------------
   PUBLIC CHATBOT MESSAGE
------------------------------------------------*/
export const publicChatbot = async (req, res) => {
  try {
    const chatbotId = req.params.id;
    if (!isUUID(chatbotId)) {
      return res.status(400).json({ error: "Invalid chatbot ID" });
    }

    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", chatbotId)
      .single();

    if (!chatbot) return res.status(404).json({ error: "Chatbot not found" });

    const cfg = parseConfig(chatbot.config);

    const lastUserMsg =
      req.body.messages[req.body.messages.length - 1]?.content || "";

    // 🔥 Intent detection
    const intent = await detectIntent(chatbot.user_id, lastUserMsg);
    if (intent.matched) return res.json({ reply: intent.reply });

    const filesText = await fetchFilesText(chatbot.user_id, cfg.files || []);

    const systemPrompt = buildSystemPrompt({
      name: chatbot.name,
      business_info: chatbot.business_info || cfg.business_info,
      filesText,
    });

    const groqMsg = mapMessages(systemPrompt, req.body.messages);

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMsg,
    });

    return res.json({
      reply: response.choices[0].message?.content,
    });
  } catch (err) {
    console.error("publicChatbot error:", err);
    return res.status(500).json({ error: "Failed to process message" });
  }
};

/* -----------------------------------------------
   GET PUBLIC CHATBOT CONFIG
------------------------------------------------*/
export const getPublicChatbotConfig = async (req, res) => {
  try {
    const id = req.params.id;
    if (!isUUID(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", id)
      .single();

    if (!chatbot) {
      return res.status(404).json({ error: "Chatbot not found" });
    }

    const cfg = parseConfig(chatbot.config);

    return res.json({
      id: chatbot.id,
      name: chatbot.name,
      business_info: chatbot.business_info,
      welcome_message:
        cfg.welcome_message || "👋 Hi! How can we help you?",
      themeColors: cfg.themeColors || {},
      logo_url: cfg.logo_url || "",
      files: cfg.files || [],
    });
  } catch (err) {
    console.error("getPublicChatbotConfig error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};

/* -----------------------------------------------
   BASIC CRUD
------------------------------------------------*/
export const createChatbot = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("chatbots")
      .insert([
        {
          user_id: userId,
          name: req.body.name,
          business_info: req.body.business_info,
          config: req.body.config,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error("createChatbot error:", err);
    return res.status(500).json({ error: "Failed to create chatbot" });
  }
};

export const getUserChatbots = async (req, res) => {
  const { data } = await supabase
    .from("chatbots")
    .select("*")
    .eq("user_id", req.user.id)
    .limit(1);

  return res.json(data?.[0] || null);
};

export const updateChatbot = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("chatbots")
      .update({
        name: req.body.name,
        business_info: req.body.business_info,
        config: req.body.config,
      })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error("updateChatbot error:", err);
    return res.status(500).json({ error: "Failed to update chatbot" });
  }
};
