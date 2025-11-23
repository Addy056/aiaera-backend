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
       1️⃣ Load chatbot
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
       2️⃣ Load integrations
    --------------------------------------------- */
    const { data: integ } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    /* ---------------------------------------------
       3️⃣ Load file text
    --------------------------------------------- */
    let filesText = "";
    if (Array.isArray(cfg.files)) {
      for (const f of cfg.files) {
        const text = await loadFileText(f.url);
        if (text) filesText += text + "\n---\n";
      }
    }

    /* ---------------------------------------------
       4️⃣ Context extraction (Real Estate)
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
       5️⃣ Unified config (same as public chatbot)
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
       6️⃣ Generate LLM response
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
