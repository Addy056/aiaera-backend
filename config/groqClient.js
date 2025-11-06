// backend/utils/groqClient.js
import "dotenv/config";
import Groq from "groq-sdk";

const { GROQ_API_KEY, NODE_ENV } = process.env;

let groq = null;

// Initialize Groq client safely
if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY });
  if (NODE_ENV !== "production") {
    console.log("[Groq] Client initialized.");
  }
} else {
  console.warn("[Groq] GROQ_API_KEY not set. Using mock AI replies.");
}

/**
 * Mock fallback when Groq is unavailable
 */
function mockReply({ message, businessName }) {
  const base = businessName ? `(${businessName}) ` : "";
  return `${base}Mock AI: I received "${message}". Connect Groq for real AI responses.`;
}

/**
 * Ask Groq LLM
 * @param {Object} params
 * @param {string} params.systemPrompt
 * @param {string} params.userPrompt
 * @param {string} [params.model='llama-3.3-70b-versatile']
 * @param {string} [params.businessName]
 * @param {number} [params.temperature=0.7]
 * @param {number} [params.max_tokens=1024]
 */
export async function askLLM({
  systemPrompt,
  userPrompt,
  model = "llama-3.3-70b-versatile",
  businessName,
  temperature = 0.7,
  max_tokens = 1024,
}) {
  if (!groq) {
    return {
      ok: true,
      content: mockReply({ message: userPrompt, businessName }),
      provider: "mock",
    };
  }

  try {
    // Add a timeout wrapper (30s default)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const completion = await groq.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const content =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I couldn’t generate a response.";

    return { ok: true, content, provider: "groq" };
  } catch (err) {
    clearTimeout(timeout);

    const errorMsg = err?.response?.data || err?.message || "Unknown error";
    console.error("[Groq] Error:", errorMsg);

    if (NODE_ENV !== "production") {
      return {
        ok: true,
        content: `Preview fallback (Groq error): ${errorMsg}`,
        provider: "mock",
      };
    }

    return {
      ok: true,
      content:
        "We’re having trouble generating AI responses right now. Please try again later.",
      provider: "mock",
    };
  }
}
