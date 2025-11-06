// backend/utils/groqClient.js
import "dotenv/config";
import Groq from "groq-sdk";
import supabase from "../config/supabaseClient.js";

const { GROQ_API_KEY, NODE_ENV } = process.env;

let groq = null;
if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY });
  if (NODE_ENV !== "production") console.log("[Groq] ✅ Client initialized.");
} else {
  console.warn("[Groq] ⚠️ GROQ_API_KEY not set — using mock mode.");
}

// ---------------------------------------------
// Default + fallback models
// ---------------------------------------------
const RECOMMENDED_MODELS = [
  "llama-3.1-8b-instant",       // ✅ Fastest for previews
  "llama-3.1-70b-versatile",    // ✅ High-quality reasoning
  "mixtral-8x7b",               // ✅ Strong multilingual
  "gemma-7b-it",                // ✅ Lightweight fallback
];

// ---------------------------------------------
// Mock fallback
// ---------------------------------------------
function mockReply({ message, businessName }) {
  const base = businessName ? `(${businessName}) ` : "";
  return `${base}Preview mode: I received "${message}". Connect Groq for real AI answers.`;
}

// ---------------------------------------------
// Ask LLM (with auto-fallback & dynamic files)
// ---------------------------------------------
export async function askLLM({
  systemPrompt,
  userPrompt,
  model = process.env.LLM_MODEL || RECOMMENDED_MODELS[0],
  businessName,
  userId,
  chatbotId,
}) {
  if (!groq) {
    return { ok: true, content: mockReply({ message: userPrompt, businessName }), provider: "mock" };
  }

  try {
    let extraContext = "";

    // ------------------ Fetch chatbot files & scraped content ------------------
    if (userId && chatbotId) {
      const { data: chatbotData, error: chatErr } = await supabase
        .from("chatbots")
        .select("config")
        .eq("id", chatbotId)
        .eq("user_id", userId)
        .single();

      if (chatErr && chatErr.code !== "PGRST116") {
        console.warn("[Groq] ⚠️ Could not fetch chatbot config:", chatErr.message);
      }

      const files = chatbotData?.config?.files || [];
      for (let f of files) {
        try {
          const { data: fileData, error: fileErr } = await supabase.storage.from("chatbot-files").download(f.path);
          if (fileErr) continue;
          const text = await fileData.text();
          extraContext += `\nFile "${f.name}": ${text}`;
        } catch (fileEx) {
          console.warn(`[Groq] ⚠️ Error reading file ${f.name}:`, fileEx.message);
        }
      }

      if (chatbotData?.config?.website_content) {
        extraContext += `\nWebsite content: ${chatbotData.config.website_content}`;
      }
    }

    const finalPrompt = `${systemPrompt}\n${extraContext}`;

    // ------------------ Attempt each model (auto-fallback) ------------------
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
          console.log(`[Groq] ✅ Using model: ${selectedModel}`);

        return { ok: true, content, provider: "groq" };
      } catch (err) {
        const msg = err?.message || err?.error?.message || err;
        if (msg.includes("decommissioned") || msg.includes("unsupported")) {
          console.warn(`[Groq] ⚠️ Model ${selectedModel} is deprecated. Trying next fallback...`);
          continue; // try next model
        }
        throw err; // other errors (network, auth, etc.)
      }
    }

    // If all models failed
    console.error("[Groq] ❌ All fallback models failed.");
    return { ok: true, content: "AI service temporarily unavailable. Please try again soon.", provider: "mock" };

  } catch (err) {
    console.error("[Groq] Unexpected error:", err?.message || err);
    return {
      ok: true,
      content: "🤖 Something went wrong while generating your response.",
      provider: "mock",
    };
  }
}
