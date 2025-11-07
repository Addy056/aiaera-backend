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
// Helper: Save or Update User Context
// --------------------
async function saveChatContext(userId, sessionId, newContext, lastMessage) {
  try {
    const { data: existing } = await supabase
      .from("user_chat_context")
      .select("id, context")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existing) {
      const updatedContext = { ...existing.context, ...newContext };
      await supabase
        .from("user_chat_context")
        .update({ context: updatedContext, last_message: lastMessage, updated_at: new Date() })
        .eq("id", existing.id);
    } else {
      await supabase.from("user_chat_context").insert([
        { user_id: userId, session_id: sessionId, context: newContext, last_message: lastMessage },
      ]);
    }
  } catch (err) {
    console.error("[ChatContext] Save error:", err.message);
  }
}

// --------------------
// Helper: Load User Context
// --------------------
async function loadChatContext(userId, sessionId) {
  const { data } = await supabase
    .from("user_chat_context")
    .select("context")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .maybeSingle();
  return data?.context || {};
}

// --------------------
// Main Controller
// --------------------
export const getChatbotPreviewReply = async (req, res) => {
  try {
    const { messages = [], userId, sessionId } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, error: "User ID is required." });
    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ success: false, error: "Messages array required." });

    const lastUserMessage = messages[messages.length - 1]?.content?.trim() || "Hi";

    // 1️⃣ Load existing context (location, budget, etc.)
    const userContext = await loadChatContext(userId, sessionId || "default");

    // 2️⃣ Detect & update context
    const newContext = {};
    const lowerMsg = lastUserMessage.toLowerCase();

    const locationMatch = lowerMsg.match(/in\s+([a-zA-Z\s]+)/);
    const budgetMatch = lowerMsg.match(/under\s*₹?(\d+)\s*l/i);
    const bhkMatch = lowerMsg.match(/(\d+)\s*bhk/i);

    if (locationMatch) newContext.location = locationMatch[1].trim();
    if (budgetMatch) newContext.budget = `${budgetMatch[1]}L`;
    if (bhkMatch) newContext.rooms = `${bhkMatch[1]} BHK`;

    // Save context changes
    await saveChatContext(userId, sessionId || "default", newContext, lastUserMessage);

    // Merge with previous context
    const combinedContext = { ...userContext, ...newContext };

    // 3️⃣ Fetch chatbot data
    const { data: businessData } = await supabase
      .from("business_data")
      .select("title, description")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("calendly_link, business_address")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("id, name")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: files } = await supabase
      .from("chatbot_files")
      .select("filename, path, bucket")
      .eq("chatbot_id", chatbot?.id || null);

    // 4️⃣ Load files into context
    const knowledge = [];
    if (files?.length) {
      for (const file of files) {
        const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${file.bucket}/${file.path}`;
        const text = await getFileContentFromSupabase(publicUrl);
        knowledge.push({ name: file.filename, content: text });
      }
    }

    // 5️⃣ Create smart system prompt
    const systemPrompt = `
You are a smart AI assistant for ${businessData?.title || "this business"}.

User context: ${JSON.stringify(combinedContext)}
Business description: ${businessData?.description || "No description"}
Address: ${integrations?.business_address || "N/A"}
Calendly: ${integrations?.calendly_link || "N/A"}

Uploaded Files: ${JSON.stringify(knowledge.map(f => f.name))}

If user asks similar queries as before, refer to their saved context.
Always be polite, helpful, and proactive.

If filters exist (location, budget, rooms), use them in your responses:
e.g., "Here are some ${combinedContext.rooms || ""} options in ${combinedContext.location || "your area"} under ${combinedContext.budget || "your budget"}."
`;

    // 6️⃣ Get AI response
    const aiResponse = await askLLM({
      systemPrompt,
      userPrompt: lastUserMessage,
      userId,
      chatbotId: chatbot?.id,
    });

    return res.status(200).json({
      success: true,
      reply: aiResponse?.content || "🤖 Sorry, I couldn’t find an answer for that right now.",
      context: combinedContext,
    });
  } catch (err) {
    console.error("[ChatbotPreview] Error:", err.message);
    return res.status(500).json({ success: false, error: "Internal error in chatbot preview." });
  }
};
