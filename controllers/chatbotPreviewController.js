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
    const { messages = [], chatbotConfig = {}, userId } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Messages array is required.",
      });
    }

    const lastUserMessage =
      messages[messages.length - 1]?.content?.toString()?.trim() || "Hi";

    if (!chatbotConfig?.name && !chatbotConfig?.businessDescription) {
      return res.status(200).json({
        success: true,
        reply: "🤖 This is a chatbot preview (mock response).",
      });
    }

    // -------------------- Fetch extra user data --------------------
    let calendlyLink = null;
    let address = chatbotConfig?.businessAddress || null;
    let website = chatbotConfig?.websiteUrl || null;

    try {
      const { data: integrations } = await supabase
        .from("user_integrations")
        .select("calendly_link")
        .eq("user_id", userId)
        .maybeSingle();

      calendlyLink = integrations?.calendly_link || null;
    } catch (err) {
      console.warn("[ChatbotPreview] Could not fetch integrations:", err.message);
    }

    // -------------------- Detect special intents --------------------
    const lowerMsg = lastUserMessage.toLowerCase();

    if (
      ["book", "meeting", "appointment", "schedule", "demo"].some((kw) =>
        lowerMsg.includes(kw)
      )
    ) {
      if (calendlyLink) {
        return res.status(200).json({
          success: true,
          reply: `📅 You can book a meeting here: ${calendlyLink}`,
        });
      } else {
        return res.status(200).json({
          success: true,
          reply:
            "I don’t have a booking link yet. Please add your Calendly link in Integrations.",
        });
      }
    }

    if (["address", "location", "where"].some((kw) => lowerMsg.includes(kw))) {
      if (address) {
        return res.status(200).json({
          success: true,
          reply: `📍 Our business address is: ${address}`,
        });
      } else {
        return res.status(200).json({
          success: true,
          reply: "No address provided yet for this business.",
        });
      }
    }

    if (["website", "site", "link"].some((kw) => lowerMsg.includes(kw))) {
      if (website) {
        return res.status(200).json({
          success: true,
          reply: `🌐 You can visit our website here: ${website}`,
        });
      } else {
        return res.status(200).json({
          success: true,
          reply: "This business doesn’t have a website linked yet.",
        });
      }
    }

    // -------------------- Parse file data --------------------
    const knowledge = [];
    if (chatbotConfig?.files?.length) {
      for (const file of chatbotConfig.files) {
        const text = await getFileContentFromSupabase(file.publicUrl);
        knowledge.push({ name: file.name, content: text });
      }
    }

    // -------------------- Ask AI (Groq) --------------------
    const aiResponse = await askLLM({
      systemPrompt: `
You are a friendly and professional AI assistant for ${chatbotConfig?.name}.
Business description: ${chatbotConfig?.businessDescription}.
Use the following files and website as context if needed:
${JSON.stringify(knowledge)}
If the user asks something unrelated, politely guide them back to the business topic.
      `,
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
