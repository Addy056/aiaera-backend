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

    // Default text
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
    const { messages = [], chatbotConfig = {}, userId } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Messages array is required.",
      });
    }

    const lastUserMessage =
      messages[messages.length - 1]?.content?.toString()?.trim() || "Hi";

    // Default if no chatbot config
    if (!chatbotConfig?.name && !chatbotConfig?.businessDescription) {
      return res.status(200).json({
        success: true,
        reply: "🤖 This is a chatbot preview (mock response).",
      });
    }

    // Collect knowledge from uploaded files
    const knowledge = [];
    if (chatbotConfig?.files?.length) {
      for (const file of chatbotConfig.files) {
        const text = await getFileContentFromSupabase(file.publicUrl);
        knowledge.push({ name: file.name, content: text });
      }
    }

    // Ask Groq model (LLM)
    try {
      const aiResponse = await askLLM({
        systemPrompt: `You are an AI assistant representing ${
          chatbotConfig?.name || "a business"
        }.
Business description: ${chatbotConfig?.businessDescription || "N/A"}.
Respond conversationally to the user's message.`,
        userPrompt: lastUserMessage,
        model: process.env.LLM_MODEL || "gemma2-9b-it",
      });

      if (aiResponse?.ok && aiResponse?.content) {
        return res.status(200).json({
          success: true,
          reply: aiResponse.content,
          knowledge,
          provider: "groq",
        });
      }
    } catch (err) {
      console.error("[ChatbotPreview] LLM error:", err.message);
    }

    // Default fallback if AI fails
    return res.status(200).json({
      success: true,
      reply: `🤖 Hello! This is a fallback chatbot preview for ${
        chatbotConfig?.name || "your business"
      }.`,
      provider: "mock",
    });
  } catch (err) {
    console.error("[ChatbotPreview] Unexpected error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Internal server error in chatbot preview.",
    });
  }
};
