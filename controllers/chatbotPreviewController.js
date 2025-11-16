// backend/controllers/chatbotPreviewController.js

import supabase from "../config/supabaseClient.js";
import { askLLM } from "../utils/groqClient.js";
import pdfParse from "pdf-parse-fixed";
import csv from "csv-parser";
import fetch from "node-fetch";
import { Readable } from "stream";

// ------------------------------
// Helper: Safe parse config
// ------------------------------
const safeParseConfig = (cfg) => {
  try {
    return typeof cfg === "string" ? JSON.parse(cfg) : cfg || {};
  } catch (err) {
    console.error("Config parse error:", err);
    return {};
  }
};

// ------------------------------
// Helper: Parse files from Public URL
// ------------------------------
async function loadFileText(fileUrl) {
  try {
    if (!fileUrl) return "";
    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = fileUrl.split(".").pop().toLowerCase();

    if (ext === "pdf") {
      const data = await pdfParse(buffer);
      return data.text.slice(0, 8000);
    }

    if (ext === "csv") {
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
    console.error("[Preview File Parse Error]:", err.message);
    return "";
  }
}

// ------------------------------
// Helper: Build System Prompt (Same as main chatbot!)
// ------------------------------
const buildAssistantPrompt = (ctx) => {
  const lines = [
    `You are an AI assistant that represents this business.`,
    `Always speak as "we" or "our business".`,
    `Use only the following info.`,
    ``,
    `--- BUSINESS DETAILS ---`,
    `Business Name: ${ctx.name || "Our Business"}`,
  ];

  // Description
  if (ctx.business_info?.trim()) {
    lines.push(`Business Description: ${ctx.business_info}`);
  } else {
    lines.push(`Business Description: We help customers with our services.`);
  }

  // Address
  if (ctx.business_address)
    lines.push(
      `Address (mention ONLY if asked): ${ctx.business_address}`
    );

  // Location
  if (ctx.location?.latitude && ctx.location?.longitude) {
    const link = `https://www.google.com/maps?q=${ctx.location.latitude},${ctx.location.longitude}`;
    lines.push(`Google Maps (only if asked): ${link}`);
  }

  // Website
  if (ctx.website_url)
    lines.push(`Website (only if asked): ${ctx.website_url}`);

  // Calendly
  if (ctx.calendly_link)
    lines.push(`Calendly (only if asked): ${ctx.calendly_link}`);

  // File text
  if (ctx.filesText)
    lines.push(`\n--- FILE DATA ---\n${ctx.filesText}`);

  // User real-time filters
  if (ctx.contextMemory && Object.keys(ctx.contextMemory).length > 0) {
    lines.push(
      `\n--- USER FILTER CONTEXT ---\n${JSON.stringify(
        ctx.contextMemory
      )}`
    );
  }

  lines.push(
    ``,
    `--- STYLE RULES ---`,
    `- Always respond professionally.`,
    `- Never say "I don't have that info".`,
    `- If missing info, answer positively and generally.`,
    `- You represent the business directly.`
  );

  return lines.join("\n");
};

// ------------------------------
// Preview Controller
// ------------------------------
export const getChatbotPreviewReply = async (req, res) => {
  try {
    const { messages = [], userId, sessionId } = req.body || {};

    if (!userId)
      return res.status(400).json({ error: "User ID required" });

    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: "Messages array required" });

    const userMsg =
      messages[messages.length - 1]?.content?.trim() || "Hello";

    /* --------------------------
       1️⃣ Load business chatbot
    -------------------------- */
    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!chatbot)
      return res.status(404).json({ error: "Chatbot not found" });

    const cfg = safeParseConfig(chatbot.config);

    /* --------------------------
       2️⃣ Load integrations
    -------------------------- */
    const { data: integ } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    /* --------------------------
       3️⃣ Load file texts (from Supabase Storage)
    -------------------------- */
    let filesText = "";
    if (Array.isArray(cfg.files)) {
      for (const file of cfg.files) {
        const text = await loadFileText(file.url);
        filesText += text + "\n---\n";
      }
    }

    /* --------------------------
       4️⃣ Detect user context (location, budget, BHK)
    -------------------------- */
    const contextMemory = {};
    const msg = userMsg.toLowerCase();

    const loc = msg.match(/in\s+([a-zA-Z\s]+)/);
    if (loc) contextMemory.location = loc[1].trim();

    const budget = msg.match(/under\s*₹?(\d+)\s*l/i);
    if (budget) contextMemory.budget = `${budget[1]}L`;

    const bhk = msg.match(/(\d+)\s*bhk/i);
    if (bhk) contextMemory.rooms = `${bhk[1]} BHK`;

    /* --------------------------
       5️⃣ Build unified config (same as public chatbot)
    -------------------------- */
    const merged = {
      id: chatbot.id,
      name: chatbot.name || "Our Business",
      business_info: chatbot.business_info || "We help customers.",
      website_url: cfg.website_url || cfg.businessWebsite || null,
      business_address:
        cfg.business_address || integ?.business_address || null,
      calendly_link:
        cfg.calendly_link || integ?.calendly_link || null,
      location: {
        latitude:
          integ?.business_lat ??
          cfg?.location?.latitude ??
          null,
        longitude:
          integ?.business_lng ??
          cfg?.location?.longitude ??
          null,
      },
      filesText,
      contextMemory,
    };

    /* --------------------------
       6️⃣ Generate preview reply
    -------------------------- */
    const systemPrompt = buildAssistantPrompt(merged);

    const aiResponse = await askLLM({
      systemPrompt,
      userPrompt: userMsg,
      userId,
      chatbotId: chatbot.id,
    });

    return res.json({
      success: true,
      reply:
        aiResponse?.content ||
        "We’d be happy to help! Could you clarify that?",
      context: contextMemory,
    });
  } catch (err) {
    console.error("[Preview Chatbot Error]:", err.message);
    return res.status(500).json({
      success: false,
      error: "Internal preview error.",
    });
  }
};
