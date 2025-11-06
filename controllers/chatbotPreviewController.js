// backend/controllers/chatbotPreviewController.js
import { askLLM } from "../utils/groqClient.js";
import supabase from "../config/supabaseClient.js";
// Use fixed version that skips debug mode
import pdfParse from "pdf-parse-fixed";
import csv from "csv-parser";
import fetch from "node-fetch";
import { Readable } from "stream";

const SUPPORTED_LANGUAGES = ["en", "es", "fr", "de", "hi"];
const isValidUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );

// ---------------- Helper: Parse uploaded files ----------------
async function getFileContentFromSupabase(fileUrl) {
  if (!fileUrl) return "";

  try {
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const extension = fileUrl.split(".").pop().toLowerCase();

    if (extension === "pdf") {
      const data = await pdfParse(Buffer.from(buffer));
      return data.text.slice(0, 8000);
    }

    if (extension === "csv") {
      const rows = [];
      await new Promise((resolve, reject) => {
        Readable.from(Buffer.from(buffer))
          .pipe(csv())
          .on("data", (row) => rows.push(row))
          .on("end", resolve)
          .on("error", reject);
      });
      return JSON.stringify(rows).slice(0, 8000);
    }

    // Default: treat as text
    return Buffer.from(buffer).toString("utf-8").slice(0, 8000);
  } catch (err) {
    console.error("[PreviewChat] File parse error:", err);
    return "";
  }
}

// ---------------- Main Controller ----------------
export const getChatbotPreviewReply = async (req, res) => {
  try {
    const { messages, chatbotConfig, userId, language = "en" } = req.body || {};

    // Validate input
    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ success: false, error: "Messages array is required.", code: "BAD_REQUEST_MESSAGES" });

    if (!chatbotConfig || !chatbotConfig.businessDescription)
      return res.status(400).json({ success: false, error: "Chatbot config is missing.", code: "BAD_REQUEST_CONFIG" });

    if (!userId || !isValidUUID(userId))
      return res.status(400).json({ success: false, error: "Valid User ID is required.", code: "BAD_REQUEST_USER" });

    const businessName = chatbotConfig.businessName?.trim() || "our business";
    const businessType = chatbotConfig.businessType?.trim() || "general";
    const businessDescription = chatbotConfig.businessDescription.trim();
    const safeLanguage = SUPPORTED_LANGUAGES.includes(language.toLowerCase()) ? language.toLowerCase() : "en";

    // Fetch user integrations (Calendly)
    let calendlyLink = null;
    try {
      const { data: integrations, error: intError } = await supabase
        .from("user_integrations")
        .select("calendly_link")
        .eq("user_id", userId)
        .maybeSingle();
      if (intError) console.warn("[PreviewChat] Integrations fetch error:", intError.message);
      calendlyLink = integrations?.calendly_link?.trim() || null;
    } catch (err) {
      console.error("[PreviewChat] Supabase fetch failed:", err.message);
    }

    // Last user message
    const lastUserMessage = messages[messages.length - 1]?.content?.toString()?.trim() || "";
    if (!lastUserMessage)
      return res.status(400).json({ success: false, error: "Last message content is empty.", code: "EMPTY_LAST_MESSAGE" });

    // Appointment detection
    const appointmentKeywords = ["book", "schedule", "appointment", "meeting", "call", "demo", "consultation"];
    const wantsAppointment = appointmentKeywords.some((kw) => new RegExp(`\\b${kw}\\b`, "i").test(lastUserMessage));
    if (wantsAppointment) {
      if (calendlyLink) return res.status(200).json({ success: true, reply: `You can book a time here: ${calendlyLink}`, provider: "calendly" });
      else return res.status(200).json({ success: true, reply: "No booking link available yet.", provider: "none" });
    }

    // Extract filters via LLM
    let filters = {};
    try {
      const filterPrompt = `
        You are a JSON generator.
        Extract structured filters from the user query for a ${businessType} business.
        Return ONLY a valid JSON object.
        User query: "${lastUserMessage}"
      `;
      const filterResult = await askLLM({
        systemPrompt: "Extract filters as JSON.",
        userPrompt: filterPrompt,
        businessName,
        model: process.env.LLM_MODEL || "gemma2-9b-it",
        language: "en",
      });
      if (filterResult.ok && filterResult.content) filters = JSON.parse(filterResult.content);
    } catch (err) {
      console.warn("[PreviewChat] Filter parse failed:", err.message);
      filters = {};
    }

    // Fetch business data
    let businessData = [];
    try {
      let query = supabase.from("business_data").select("title, description, attributes").eq("user_id", userId).eq("business_type", businessType);
      Object.entries(filters).forEach(([key, value]) => { if (value) query = query.contains("attributes", { [key]: value }); });
      const { data: results, error: dbError } = await query;
      if (dbError) console.error("[PreviewChat] DB query error:", dbError.message);
      businessData = results || [];
    } catch (err) {
      console.error("[PreviewChat] Supabase fetch failed:", err.message);
    }

    // Include uploaded files & website
    const knowledgeSources = [];
    if (chatbotConfig.files?.length) {
      for (const f of chatbotConfig.files) {
        const content = await getFileContentFromSupabase(f.publicUrl);
        knowledgeSources.push({ type: "file", name: f.name, url: f.publicUrl, content });
      }
    }
    if (chatbotConfig.websiteUrl) knowledgeSources.push({ type: "website", url: chatbotConfig.websiteUrl });

    // Ask AI for reply
    const systemPrompt = `
      You are a helpful AI assistant for ${businessName}.
      Business description: ${businessDescription}.
      Knowledge sources include uploaded files and website content if relevant.
      Strictly reply in ${safeLanguage}.
      Be friendly, natural, and professional.
    `.trim();

    const responsePrompt = `
      User asked: "${lastUserMessage}"
      Business data context: ${JSON.stringify(businessData || [], null, 2)}
      Knowledge sources: ${JSON.stringify(knowledgeSources || [], null, 2)}

      Instructions:
      - Summarize relevant info naturally in conversation.
      - Mention titles, key attributes, and files or website info if helpful.
      - If no results match, politely ask a brief clarifying question.
    `;

    const finalResult = await askLLM({
      systemPrompt,
      userPrompt: responsePrompt,
      businessName,
      model: process.env.LLM_MODEL || "gemma2-9b-it",
      language: safeLanguage,
    });

    if (!finalResult.ok || !finalResult.content) {
      console.error("[PreviewChat] LLM error:", finalResult.error);
      return res.status(502).json({ success: false, error: finalResult.error || "AI generation failed", code: "LLM_ERROR" });
    }

    return res.status(200).json({
      success: true,
      reply: finalResult.content,
      filters,
      businessData,
      knowledgeSources,
      provider: "groq",
    });
  } catch (err) {
    console.error("[PreviewChat] Unexpected error:", err?.message || err);
    return res.status(500).json({ success: false, error: "Failed to generate chatbot reply.", code: "PREVIEW_INTERNAL_ERROR" });
  }
};
