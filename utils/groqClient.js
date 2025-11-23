import "dotenv/config";
import Groq from "groq-sdk";
import supabase from "../config/supabaseClient.js";

const { GROQ_API_KEY, NODE_ENV } = process.env;

// -----------------------------------------------------
// Initialize Groq client
// -----------------------------------------------------
let groq = null;
if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY });
  if (NODE_ENV !== "production") {
    console.log("[Groq] ✅ Client initialized successfully.");
  }
} else {
  console.warn("[Groq] ⚠️ GROQ_API_KEY missing. Using mock replies.");
}

// -----------------------------------------------------
// Model priority fallback chain
// -----------------------------------------------------
const MODEL_PRIORITY = [
  "llama-3.1-8b-instant",         // fastest, best for chat
  "llama-3.1-70b-versatile",      // strong reasoning / fallback
  "mixtral-8x7b",                 // multilingual + long context
  "gemma-7b-it"                   // lighter fallback
];

// -----------------------------------------------------
// Mock Reply (no Groq key)
// -----------------------------------------------------
function mockReply({ message, businessName }) {
  return `${businessName ? `[${businessName}]` : ""} Mock AI → Received: "${message}".`;
}

// -----------------------------------------------------
// Fetch chatbot knowledge from multiple Supabase tables
// -----------------------------------------------------
async function getChatbotKnowledge(userId, chatbotId) {
  let context = "";

  try {
    if (!userId) return context;

    // 1) Business info
    const { data: business } = await supabase
      .from("business_data")
      .select("title, business_type, description")
      .eq("user_id", userId)
      .maybeSingle();

    if (business?.description) {
      context += `\n📘 Business Description:\n${business.description}\n`;
    }

    // 2) Chatbot config (website content etc.)
    if (chatbotId) {
      const { data: chatbot } = await supabase
        .from("chatbots")
        .select("name, config")
        .eq("id", chatbotId)
        .eq("user_id", userId)
        .maybeSingle();

      if (chatbot?.config?.website_content) {
        context += `\n🌐 Website Content:\n${chatbot.config.website_content.slice(0, 4000)}\n`;
      }
    }

    // 3) File data (PDF/CSV/Excel/Text parsed)
    if (chatbotId) {
      const { data: fileData } = await supabase
        .from("chatbot_file_data")
        .select("content")
        .eq("chatbot_id", chatbotId);

      if (fileData?.length) {
        for (const file of fileData) {
          const textContent =
            file?.content?.text || JSON.stringify(file.content)?.slice(0, 4000);
          context += `\n📄 Uploaded File Data:\n${textContent}\n`;
        }
      }
    }

    // 4) Integrations (address + Calendly)
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("business_address, calendly_link")
      .eq("user_id", userId)
      .maybeSingle();

    if (integrations?.business_address)
      context += `\n📍 Address:\n${integrations.business_address}\n`;

    if (integrations?.calendly_link)
      context += `\n📅 Calendly:\n${integrations.calendly_link}\n`;

  } catch (err) {
    console.error("[Groq] Context build error:", err.message);
  }

  return context;
}

// -----------------------------------------------------
// Main AI Handler (with model fallback)
// -----------------------------------------------------
export async function askLLM({
  systemPrompt,
  userPrompt,
  model = process.env.LLM_MODEL || MODEL_PRIORITY[0],
  businessName,
  userId,
  chatbotId,
}) {
  // If no Groq API key → fallback mode
  if (!groq) {
    return {
      ok: true,
      provider: "mock",
      content: mockReply({ message: userPrompt, businessName }),
    };
  }

  try {
    // Fetch context from Supabase (business + files + website + etc.)
    const context = await getChatbotKnowledge(userId, chatbotId);
    const fullSystemPrompt = `${systemPrompt}\n\n${context}`;

    // Try selected model + fallback models
    const modelChain = [model, ...MODEL_PRIORITY];

    for (const m of modelChain) {
      try {
        const completion = await groq.chat.completions.create({
          model: m,
          messages: [
            { role: "system", content: fullSystemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 700,
        });

        const content =
          completion?.choices?.[0]?.message?.content?.trim() ||
          "🤖 Sorry, I couldn’t generate a response.";

        if (NODE_ENV !== "production") {
          console.log(`[Groq] 🟢 Model used: ${m}`);
        }

        return { ok: true, provider: "groq", content };
      } catch (err) {
        const msg = err?.message || err;

        // Handle deprecated or blocked models → try next
        if (
          msg.includes("decommissioned") ||
          msg.includes("unsupported") ||
          msg.includes("not found")
        ) {
          console.warn(`[Groq] ⚠️ Model ${m} deprecated. Trying next.`);
          continue;
        }

        throw err;
      }
    }

    // If all models fail
    console.error("[Groq] ❌ All model attempts failed.");
    return {
      ok: true,
      provider: "mock",
      content: "⚠️ AI service temporarily unavailable. Try again soon.",
    };

  } catch (err) {
    console.error("[Groq] Unexpected error:", err?.message || err);
    return {
      ok: true,
      provider: "mock",
      content: "🤖 Something went wrong generating your reply.",
    };
  }
}
