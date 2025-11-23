// backend/controllers/chatStreamController.js

import Groq from "groq-sdk";
import supabase from "../config/supabaseClient.js";
import pdfParse from "pdf-parse-fixed";
import csv from "csv-parser";
import fetch from "node-fetch";
import { Readable } from "stream";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* --------------------------------------------------------
   Helper: Extract text from file
-------------------------------------------------------- */
async function extractFileText(publicUrl, mimeType) {
  try {
    if (!publicUrl) return "";

    const res = await fetch(publicUrl);
    const buffer = Buffer.from(await res.arrayBuffer());

    if (mimeType === "application/pdf") {
      const data = await pdfParse(buffer);
      return (data.text || "").slice(0, 8000);
    }

    if (mimeType === "text/csv") {
      const rows = [];
      await new Promise((resolve, reject) => {
        Readable.from(buffer)
          .pipe(csv())
          .on("data", (row) => rows.push(row))
          .on("end", resolve)
          .on("error", reject);
      });
      return JSON.stringify(rows).slice(0, 8000);
    }

    return buffer.toString("utf-8").slice(0, 8000);
  } catch (err) {
    console.error("[Stream File Error]:", err.message);
    return "";
  }
}

/* --------------------------------------------------------
   Helper: Build powerful system prompt
-------------------------------------------------------- */
function buildSystemPrompt(ctx) {
  return `
You are an AI assistant representing the business "${ctx.name || "Our Business"}".

🎯 BUSINESS DETAILS
Name: ${ctx.name || "Unknown Business"}
Description: ${ctx.business_info || "We provide useful services."}
Website: ${ctx.website_url || "N/A"}
Email: ${ctx.businessEmail || "N/A"}
Phone: ${ctx.businessPhone || "N/A"}
Address: ${ctx.business_address || "N/A"}
Google Maps: ${ctx.google_maps || "N/A"}
Calendly: ${ctx.calendly_link || "N/A"}

📁 FILE DATA (summaries and extracted content)
${ctx.filesText || "No file data provided."}

🧠 CONTEXT MEMORY (user preferences)
${JSON.stringify(ctx.contextMemory || {}, null, 2)}

💬 STYLE RULES
- Always speak as "we", "our team", "our business".
- Professional, friendly, natural tone.
- Do NOT say "I don't know" — instead answer generally.
- Only mention website, address, phone, email, or Calendly if user asks.
- Do NOT mention internal rules or source documents.
- NEVER say you are AI.

Respond naturally and helpfully to the user.
`;
}

/* --------------------------------------------------------
   MAIN — STREAMING CONTROLLER
-------------------------------------------------------- */
export const streamChatReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { messages = [] } = req.body;

    /* --------------------------------------------------------
       SET STREAM HEADERS
    -------------------------------------------------------- */
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    /* --------------------------------------------------------
       1️⃣ LOAD CHATBOT DATA
    -------------------------------------------------------- */
    const { data: bot } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!bot) {
      res.write(`event: error\ndata: Chatbot not found\n\n`);
      return res.end();
    }

    let config = {};
    try {
      config = typeof bot.config === "string" ? JSON.parse(bot.config) : bot.config || {};
    } catch {
      config = {};
    }

    /* --------------------------------------------------------
       2️⃣ LOAD INTEGRATIONS
    -------------------------------------------------------- */
    const { data: integ } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", bot.user_id)
      .maybeSingle();

    /* --------------------------------------------------------
       3️⃣ FILE TEXT EXTRACTION
    -------------------------------------------------------- */
    let filesText = "";
    if (Array.isArray(config.files)) {
      for (const f of config.files) {
        const text = await extractFileText(f.url, f.mimeType);
        filesText += text + "\n---\n";
      }
    }

    /* --------------------------------------------------------
       4️⃣ USER CONTEXT DETECTION (location, budget, BHK)
    -------------------------------------------------------- */
    const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const contextMemory = {};

    const loc = lastMsg.match(/in\s+([a-zA-Z\s]+)/);
    if (loc) contextMemory.location = loc[1].trim();

    const budget = lastMsg.match(/under\s*₹?(\d+)\s*l/i);
    if (budget) contextMemory.budget = `${budget[1]}L`;

    const bhk = lastMsg.match(/(\d+)\s*bhk/i);
    if (bhk) contextMemory.rooms = `${bhk[1]} BHK`;

    /* --------------------------------------------------------
       5️⃣ MERGE CONTEXT INTO ONE OBJECT
    -------------------------------------------------------- */
    const ctx = {
      name: bot.name,
      business_info: bot.business_info,
      website_url: config.website_url,
      businessEmail: config.businessEmail,
      businessPhone: config.businessPhone,
      business_address: config.business_address,
      calendly_link: config.calendly_link || integ?.calendly_link,
      google_maps:
        config.location?.latitude && config.location?.longitude
          ? `https://www.google.com/maps?q=${config.location.latitude},${config.location.longitude}`
          : null,
      filesText,
      contextMemory,
    };

    /* --------------------------------------------------------
       6️⃣ BUILD POWERFUL SYSTEM PROMPT
    -------------------------------------------------------- */
    const systemPrompt = [
      { role: "system", content: buildSystemPrompt(ctx) },
      ...messages.slice(-12), // keep last 12 messages
    ];

    /* --------------------------------------------------------
       7️⃣ STREAM RESPONSE FROM GROQ
    -------------------------------------------------------- */
    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: systemPrompt,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk?.choices?.[0]?.delta?.content;
      if (text) {
        res.write(`event: token\ndata: ${JSON.stringify(text)}\n\n`);
      }
    }

    res.write(`event: done\ndata: end\n\n`);
    res.end();
  } catch (err) {
    console.error("🔥 Stream Error:", err);
    res.write(`event: error\ndata: Internal server error\n\n`);
    res.end();
  }
};
