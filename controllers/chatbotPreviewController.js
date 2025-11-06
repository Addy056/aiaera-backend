// backend/controllers/chatbotPreviewController.js
import { askLLM } from "../utils/groqClient.js";
import supabase from "../config/supabaseClient.js";
import pdfParse from "pdf-parse-fixed";
import csv from "csv-parser";
import fetch from "node-fetch";
import { Readable } from "stream";

// --------------------
// Helper: Parse files from Supabase
// --------------------
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

    return Buffer.from(buffer).toString("utf-8").slice(0, 8000);
  } catch (err) {
    console.error("[ChatbotPreview] File parse error:", err.message);
    return "";
  }
}

// --------------------
// Controller
// --------------------
export const getChatbotPreviewReply = async (req, res) => {
  try {
    const { messages = [], userId } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: "Messages array is required." });
    }

    const lastUserMessage = messages[messages.length - 1]?.content?.toString()?.trim() || "Hi";

    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required for chatbot preview." });
    }

    // -------------------- Fetch chatbot configuration --------------------
    const { data: chatbotConfig, error: cfgError } = await supabase
      .from("chatbot_configs")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (cfgError) {
      console.error("[ChatbotPreview] Supabase config fetch error:", cfgError.message);
      return res.status(500).json({ success: false, error: "Failed to fetch chatbot config." });
    }

    if (!chatbotConfig) {
      return res.status(200).json({
        success: true,
        reply: "🤖 This is a chatbot preview — no configuration found for this user.",
      });
    }

    // -------------------- Extract config details --------------------
    const businessName = chatbotConfig?.name || "this business";
    const description = chatbotConfig?.businessDescription || "No description provided.";
    const website = chatbotConfig?.websiteUrl || "N/A";
    const address = chatbotConfig?.businessAddress || "N/A";
    const files = chatbotConfig?.files || [];

    // -------------------- Fetch Calendly link --------------------
    let calendlyLink = null;
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("calendly_link")
      .eq("user_id", userId)
      .maybeSingle();
    calendlyLink = integrations?.calendly_link || null;

    // -------------------- Handle Intent: Book Meeting --------------------
    const lowerMsg = lastUserMessage.toLowerCase();
    if (["book", "meeting", "appointment", "schedule", "demo"].some((kw) => lowerMsg.includes(kw))) {
      if (calendlyLink) {
        return res.status(200).json({
          success: true,
          reply: `📅 You can book a meeting here: ${calendlyLink}`,
        });
      }
      return res.status(200).json({
        success: true,
        reply: "I don’t have a booking link yet. Please add your Calendly link in Integrations.",
      });
    }

    // -------------------- Handle Intent: Address --------------------
    if (["address", "location", "where"].some((kw) => lowerMsg.includes(kw))) {
      if (address && address !== "N/A") {
        return res.status(200).json({
          success: true,
          reply: `📍 Our business address is: ${address}`,
        });
      }
      return res.status(200).json({
        success: true,
        reply: "No address provided yet for this business.",
      });
    }

    // -------------------- Handle Intent: Website --------------------
    if (["website", "site", "link"].some((kw) => lowerMsg.includes(kw))) {
      if (website && website !== "N/A") {
        return res.status(200).json({
          success: true,
          reply: `🌐 You can visit our website here: ${website}`,
        });
      }
      return res.status(200).json({
        success: true,
        reply: "This business doesn’t have a website linked yet.",
      });
    }

    // -------------------- Include Uploaded Files --------------------
    const knowledge = [];
    for (const file of files) {
      const text = await getFileContentFromSupabase(file.publicUrl);
      knowledge.push({ name: file.name, content: text });
    }

    // -------------------- AI System Prompt --------------------
    const systemPrompt = `
You are an intelligent AI assistant representing the business "${businessName}".

Official Business Details:
---
Description: ${description}
Website: ${website}
Address: ${address}
---

Uploaded Knowledge Files:
${JSON.stringify(knowledge, null, 2)}

Rules:
- Always act as the business representative.
- Never say you don’t know about the business — use the info above confidently.
- Answer based ONLY on the provided business info and uploaded data.
- Be conversational, professional, and brief.
`;

    // -------------------- Ask Groq AI --------------------
    const aiResponse = await askLLM({
      systemPrompt,
      userPrompt: lastUserMessage,
      model: process.env.LLM_MODEL || "llama-3.1-8b-instant",
    });

    if (aiResponse?.ok && aiResponse?.content) {
      return res.status(200).json({
        success: true,
        reply: aiResponse.content,
        provider: "groq",
      });
    }

    // -------------------- Fallback --------------------
    return res.status(200).json({
      success: true,
      reply: "🤖 Sorry, I couldn’t find an answer for that right now.",
    });
  } catch (err) {
    console.error("[ChatbotPreview] Unexpected error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Internal server error in chatbot preview.",
    });
  }
};
