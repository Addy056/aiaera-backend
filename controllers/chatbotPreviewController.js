// backend/controllers/chatbotPreviewController.js

import supabase from "../config/supabaseClient.js";
import { askLLM } from "../utils/groqClient.js";
import pdfParse from "pdf-parse-fixed";
import csv from "csv-parser";
import fetch from "node-fetch";
import { Readable } from "stream";

/* ----------------------------------------------------
   SAFE PARSE
---------------------------------------------------- */
const safeParse = (cfg) => {
  try {
    return typeof cfg === "string" ? JSON.parse(cfg) : cfg || {};
  } catch (err) {
    console.error("❌ Config parse error:", err);
    return {};
  }
};

/* ----------------------------------------------------
   UPDATED INTENT DETECTION (MULTIPLE MEETING LINKS)
---------------------------------------------------- */
const detectIntent = async (userId, text) => {
  text = text.toLowerCase();

  // Meeting-related keywords
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
    "joining link",
    "call link",
    "calendly",
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

  /* ------------------------------
     📌 MEETING INTENT (MULTIPLE)
  -------------------------------*/
  if (isMeeting) {
    const { data: integ } = await supabase
      .from("user_integrations")
      .select("meeting_links")
      .eq("user_id", userId)
      .maybeSingle();

    if (integ?.meeting_links) {
      const { calendly, google_meet, zoom, teams, other } = integ.meeting_links;

      const links = [];
      if (calendly) links.push(`• Calendly: ${calendly}`);
      if (google_meet) links.push(`• Google Meet: ${google_meet}`);
      if (zoom) links.push(`• Zoom: ${zoom}`);
      if (teams) links.push(`• Microsoft Teams: ${teams}`);
      if (other) links.push(`• Other: ${other}`);

      if (links.length) {
        return {
          matched: true,
          reply:
            `Here are our available meeting options:\n\n` +
            links.join("\n"),
        };
      }
    }
  }

  /* ------------------------------
     📌 LOCATION INTENT
  -------------------------------*/
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

/* ----------------------------------------------------
   LOAD FILE CONTENT (PDF / CSV / TXT / MD)
---------------------------------------------------- */
async function loadFileText(fileUrl) {
  try {
    if (!fileUrl) return "";
    const res = await fetch(fileUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = fileUrl.split(".").pop().toLowerCase();

    if (ext === "pdf") {
      const data = await pdfParse(buffer);
      return (data.text || "").slice(0, 8000);
    }

    if (ext === "csv") {
      const rows = [];
      await new Promise((resolve, reject) => {
        Readable.from(buffer)
          .pipe(csv())
          .on("data", (r) => rows.push(r))
          .on("end", resolve)
          .on("error", reject);
      });
      return JSON.stringify(rows).slice(0, 8000);
    }

    return buffer.toString("utf8").slice(0, 8000);
  } catch (err) {
    console.error("❌ File parse error:", err.message);
    return "";
  }
}

/* ----------------------------------------------------
   ASSISTANT SYSTEM PROMPT
---------------------------------------------------- */
const buildPrompt = (ctx) => {
  return `
You are an AI assistant for this business. Always reply as "we" or "our business".

--- BUSINESS DETAILS ---
Business Name: ${ctx.name}
Business Description: ${ctx.business_info}

${ctx.website_url ? `Website: ${ctx.website_url}` : ""}
${ctx.business_address ? `Address: ${ctx.business_address}` : ""}

${ctx.calendly_link ? `Calendly: ${ctx.calendly_link}` : ""}

${ctx.location.latitude && ctx.location.longitude
      ? `Google Maps: https://www.google.com/maps?q=${ctx.location.latitude},${ctx.location.longitude}`
      : ""
    }

--- CONTEXT MEMORY ---
${JSON.stringify(ctx.contextMemory || {})}

--- FILE DATA ---
${ctx.filesText || "No files provided"}

--- INSTRUCTIONS ---
- Always answer confidently using business information.
- NEVER say “I don’t have data”.
- If info is missing, reply positively and generally.
- Keep responses concise, helpful, friendly, and human-like.
  `;
};

/* ----------------------------------------------------
   PREVIEW CONTROLLER
---------------------------------------------------- */
export const getChatbotPreviewReply = async (req, res) => {
  try {
    const { userId, messages = [] } = req.body;

    if (!userId)
      return res.status(400).json({ success: false, error: "User ID required" });

    if (!messages.length)
      return res.status(400).json({ success: false, error: "Messages required" });

    const userMsg = messages[messages.length - 1].content?.trim() || "Hello";

    /* ---------------------------------------------
       🔥 1️⃣ INTENT DETECTION (BEFORE AI)
    --------------------------------------------- */
    const intent = await detectIntent(userId, userMsg);
    if (intent.matched) {
      return res.json({
        success: true,
        reply: intent.reply,
      });
    }

    /* ---------------------------------------------
       2️⃣ Load chatbot
    --------------------------------------------- */
    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!chatbot)
      return res.status(404).json({ success: false, error: "Chatbot not found" });

    const cfg = safeParse(chatbot.config);

    /* ---------------------------------------------
       3️⃣ Load integrations
    --------------------------------------------- */
    const { data: integ } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    /* ---------------------------------------------
       4️⃣ Load file text
    --------------------------------------------- */
    let filesText = "";
    if (Array.isArray(cfg.files)) {
      for (const f of cfg.files) {
        const text = await loadFileText(f.url);
        if (text) filesText += text + "\n---\n";
      }
    }

    /* ---------------------------------------------
       5️⃣ Context extraction (Real Estate)
    --------------------------------------------- */
    const lc = userMsg.toLowerCase();
    const contextMemory = {};

    const loc = lc.match(/in\s+([a-zA-Z\s]+)/);
    if (loc) contextMemory.location = loc[1].trim();

    const budget = lc.match(/under\s*₹?(\d+)\s*l/i);
    if (budget) contextMemory.budget = `${budget[1]} Lakhs`;

    const bhk = lc.match(/(\d+)\s*bhk/i);
    if (bhk) contextMemory.rooms = `${bhk[1]} BHK`;

    /* ---------------------------------------------
       6️⃣ Unified config
    --------------------------------------------- */
    const merged = {
      id: chatbot.id,
      name: chatbot.name || "Our Business",
      business_info: chatbot.business_info || "We help customers.",
      website_url: cfg.businessWebsite || null,
      business_address: integ?.business_address || null,
      calendly_link: integ?.calendly_link || null,
      location: {
        latitude: integ?.business_lat || null,
        longitude: integ?.business_lng || null,
      },
      filesText,
      contextMemory,
    };

    /* ---------------------------------------------
       7️⃣ Generate AI reply
    --------------------------------------------- */
    const systemPrompt = buildPrompt(merged);

    const aiResponse = await askLLM({
      systemPrompt,
      userPrompt: userMsg,
      userId,
      chatbotId: chatbot.id,
    });

    return res.json({
      success: true,
      reply: aiResponse?.content?.trim() || "Happy to help! Could you clarify?",
    });
  } catch (err) {
    console.error("❌ Preview Chatbot Error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Internal error while generating preview reply",
    });
  }
};
