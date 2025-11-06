// backend/utils/groqClient.js
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
  if (NODE_ENV !== "production") console.log("[Groq] ✅ Client initialized successfully.");
} else {
  console.warn("[Groq] ⚠️ GROQ_API_KEY not found. Using mock responses.");
}

// ---------------------------------------------
// Model priority (auto-fallback order)
// ---------------------------------------------
const RECOMMENDED_MODELS = [
  "llama-3.1-8b-instant",      // Fast, accurate — best for production
  "llama-3.1-70b-versatile",   // Strong reasoning fallback
  "mixtral-8x7b",              // Multi-language + long context
  "gemma-7b-it",               // Lightweight fallback
];

// ---------------------------------------------
// Mock fallback
// ---------------------------------------------
function mockReply({ message, businessName }) {
  const base = businessName ? `(${businessName}) ` : "";
  return `${base}Mock AI: I received "${message}". Connect Groq API for real answers.`;
}

// ---------------------------------------------
// Helper: Fetch chatbot knowledge from Supabase
// ---------------------------------------------
async function getChatbotKnowledge(userId, chatbotId) {
  let context = "";

  try {
    if (!userId || !chatbotId) return context;

    const { data: chatbotData, error: chatErr } = await supabase
      .from("chatbots")
      .select("config")
      .eq("id", chatbotId)
      .eq("user_id", userId)
      .single();

    if (chatErr && chatErr.code !== "PGRST116") {
      console.warn("[Groq] ⚠️ Could not fetch chatbot config:", chatErr.message);
      return context;
    }

    const config = chatbotData?.config || {};
    const files = config?.files || [];

    for (let f of files) {
      try {
        const { data: fileData, error: fileErr } = await supabase.storage
          .from("chatbot-files")
          .download(f.path);
        if (fileErr) continue;

        const text = await fileData.text();
        context += `\nFile "${f.name}": ${text.slice(0, 4000)}\n`;
      } catch (fileEx) {
        console.warn(`[Groq] ⚠️ Error reading file ${f.name}:`, fileEx.message);
      }
    }

    if (config?.website_content) {
      context += `\nWebsite content:\n${config.website_content.slice(0, 4000)}\n`;
    }

  } catch (err) {
    console.error("[Groq] ⚠️ Error fetching Supabase knowledge:", err.message);
  }

  return context;
}

// ---------------------------------------------
// Ask Groq LLM (with fallback + context)
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
    const finalPrompt = `${systemPrompt}\n${extraContext}`;

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
          max_tokens: 600,
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
          continue; // try next model
        }
        throw err;
      }
    }

    console.error("[Groq] ❌ All models failed.");
    return {
      ok: true,
      content: "AI service temporarily unavailable. Please try again soon.",
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
