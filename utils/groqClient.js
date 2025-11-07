import "dotenv/config";
import Groq from "groq-sdk";
import supabase from "../config/supabaseClient.js";

const { GROQ_API_KEY, NODE_ENV } = process.env;

// ---------------------------------------------
// Initialize Groq client
// ---------------------------------------------
let groq = null;
if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY });
  if (NODE_ENV !== "production")
    console.log("[Groq] ✅ Client initialized successfully.");
} else {
  console.warn("[Groq] ⚠️ GROQ_API_KEY not found. Using mock responses.");
}

// ---------------------------------------------
// Model priority (auto-fallback order)
// ---------------------------------------------
const RECOMMENDED_MODELS = [
  "llama-3.1-8b-instant",      // Fast, balanced, best for previews
  "llama-3.1-70b-versatile",   // Strong reasoning fallback
  "mixtral-8x7b",              // Multi-language + long context
  "gemma-7b-it",               // Lightweight fallback
];

// ---------------------------------------------
// Mock fallback
// ---------------------------------------------
function mockReply({ message, businessName }) {
  const base = businessName ? `(${businessName}) ` : "";
  return `${base}Mock AI: I received "${message}". Connect Groq API for real responses.`;
}

// ---------------------------------------------
// Fetch chatbot-related knowledge from Supabase
// ---------------------------------------------
async function getChatbotKnowledge(userId, chatbotId) {
  let context = "";

  if (!userId || !chatbotId) return context;

  try {
    // ---------------- Fetch business description ----------------
    const { data: business } = await supabase
      .from("business_data")
      .select("business_type, title, description")
      .eq("user_id", userId)
      .maybeSingle();

    if (business?.description) {
      context += `\n📘 Business Description: ${business.description}\n`;
    }

    // ---------------- Fetch chatbot config ----------------
    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("config, name")
      .eq("id", chatbotId)
      .eq("user_id", userId)
      .maybeSingle();

    if (chatbot?.config?.website_content) {
      context += `\n🌐 Website Content:\n${chatbot.config.website_content.slice(0, 4000)}\n`;
    }

    // ---------------- Fetch chatbot file data (parsed text) ----------------
    const { data: fileData } = await supabase
      .from("chatbot_file_data")
      .select("content")
      .eq("chatbot_id", chatbotId);

    if (fileData?.length) {
      for (const file of fileData) {
        const fileText = file.content?.text || JSON.stringify(file.content);
        context += `\n📄 File Data:\n${fileText.slice(0, 4000)}\n`;
      }
    }

    // ---------------- Fetch integrations (address, Calendly) ----------------
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("business_address, calendly_link")
      .eq("user_id", userId)
      .maybeSingle();

    if (integrations?.business_address)
      context += `\n📍 Address: ${integrations.business_address}`;
    if (integrations?.calendly_link)
      context += `\n📅 Calendly Link: ${integrations.calendly_link}`;

  } catch (err) {
    console.error("[Groq] ⚠️ Error building context from Supabase:", err.message);
  }

  return context;
}

// ---------------------------------------------
// Ask Groq LLM (with fallback + contextual data)
// ---------------------------------------------
export async function askLLM({
  systemPrompt,
  userPrompt,
  model = process.env.LLM_MODEL || RECOMMENDED_MODELS[0],
  businessName,
  userId,
  chatbotId,
}) {
  // ------------------ No Groq API key → Mock mode ------------------
  if (!groq) {
    return {
      ok: true,
      content: mockReply({ message: userPrompt, businessName }),
      provider: "mock",
    };
  }

  try {
    // ------------------ Fetch contextual data ------------------
    const extraContext = await getChatbotKnowledge(userId, chatbotId);
    const finalPrompt = `${systemPrompt}\n\n${extraContext}`;

    // ------------------ Model Fallback Logic ------------------
    for (const selectedModel of [model, ...RECOMMENDED_MODELS]) {
      try {
        const completion = await groq.chat.completions.create({
          model: selectedModel,
          messages: [
            { role: "system", content: finalPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 700,
        });

        const content =
          completion?.choices?.[0]?.message?.content?.trim() ||
          "🤖 Sorry, I couldn’t generate a response.";

        if (NODE_ENV !== "production")
          console.log(`[Groq] ✅ Model used: ${selectedModel}`);

        return { ok: true, content, provider: "groq" };
      } catch (err) {
        const msg = err?.message || err?.error?.message || err;
        if (
          msg.includes("decommissioned") ||
          msg.includes("unsupported") ||
          msg.includes("not found")
        ) {
          console.warn(`[Groq] ⚠️ Model ${selectedModel} deprecated. Trying next...`);
          continue; // try next fallback model
        }
        throw err;
      }
    }

    // ------------------ All models failed ------------------
    console.error("[Groq] ❌ All Groq models failed.");
    return {
      ok: true,
      content: "⚠️ AI service temporarily unavailable. Please try again soon.",
      provider: "mock",
    };
  } catch (err) {
    console.error("[Groq] Unexpected error:", err?.message || err);
    return {
      ok: true,
      content: "🤖 Something went wrong while generating your response.",
      provider: "mock",
    };
  }
}
