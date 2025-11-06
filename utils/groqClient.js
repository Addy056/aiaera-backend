// backend/utils/groqClient.js
import "dotenv/config";
import Groq from "groq-sdk";
import supabase from "../config/supabaseClient.js";

const { GROQ_API_KEY, NODE_ENV } = process.env;

let groq = null;

// Initialize Groq client
if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY });
  if (NODE_ENV !== "production") console.log("[Groq] Client initialized successfully.");
} else {
  console.warn("[Groq] GROQ_API_KEY not set. Using mock responses.");
}

// ------------------ Mock Reply ------------------
function mockReply({ message, businessName }) {
  const base = businessName ? `(${businessName}) ` : "";
  return `${base}Preview mode: I received "${message}". Connect Groq for real AI answers.`;
}

// ------------------ Ask LLM ------------------
/**
 * Ask Groq (or mock) and dynamically include files & website content
 *
 * @param {Object} params
 * @param {string} params.systemPrompt - Base system prompt
 * @param {string} params.userPrompt - User message
 * @param {string} [params.model='gemma2-9b-it']
 * @param {string} [params.businessName]
 * @param {string} [params.userId] - for fetching chatbot files
 * @param {string} [params.chatbotId] - for fetching chatbot files
 * @returns {Promise<{ok: boolean, content: string, provider: string}>}
 */
export async function askLLM({
  systemPrompt,
  userPrompt,
  model = "gemma2-9b-it",
  businessName,
  userId,
  chatbotId,
}) {
  // Fallback if Groq client is not initialized
  if (!groq) {
    return { ok: true, content: mockReply({ message: userPrompt, businessName }), provider: "mock" };
  }

  try {
    let extraContext = "";

    // ------------------ Fetch files & website content ------------------
    if (userId && chatbotId) {
      const { data: chatbotData, error: chatErr } = await supabase
        .from("chatbots")
        .select("config")
        .eq("id", chatbotId)
        .eq("user_id", userId)
        .single();

      if (chatErr && chatErr.code !== "PGRST116") {
        console.warn("[Groq] Failed to fetch chatbot config:", chatErr.message);
      }

      const files = chatbotData?.config?.files || [];
      for (let f of files) {
        try {
          const { data: fileData, error: fileErr } = await supabase.storage.from("chatbot-files").download(f.path);
          if (fileErr) {
            console.warn(`[Groq] Failed to download file ${f.name}:`, fileErr.message);
            continue;
          }
          const text = await fileData.text();
          extraContext += `\nFile "${f.name}": ${text}`;
        } catch (fileEx) {
          console.warn(`[Groq] Error reading file ${f.name}:`, fileEx.message);
        }
      }

      // Include website content if pre-scraped
      if (chatbotData?.config?.website_content) {
        extraContext += `\nWebsite content: ${chatbotData.config.website_content}`;
      }
    }

    // ------------------ Final system prompt ------------------
    const finalPrompt = `${systemPrompt}\n${extraContext}`;

    // ------------------ Ask Groq ------------------
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: finalPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 600,
    });

    const content = completion?.choices?.[0]?.message?.content?.trim() || "Sorry, I could not generate a response.";

    return { ok: true, content, provider: "groq" };
  } catch (err) {
    console.error("[Groq] Error:", err?.message || err);

    // Dev-friendly
    if (NODE_ENV !== "production") {
      return { ok: true, content: `Preview fallback (Groq error): ${err?.message || "unknown error"}`, provider: "mock" };
    }

    // Production-friendly
    return { ok: true, content: "We’re having trouble generating AI responses right now. Please try again later.", provider: "mock" };
  }
}
