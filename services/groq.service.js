import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.1-8b-instant";
const MAX_HISTORY_MESSAGES = 20;

/*
========================================
GENERATE AI REPLY
========================================
*/

export const generateAIReply = async ({
  systemPrompt,
  userMessage,
  history = [],
}) => {
  try {
    if (!systemPrompt) {
      throw new Error(
        "System prompt is required."
      );
    }

    const message =
      String(userMessage || "").trim();

    if (!message) {
      throw new Error(
        "User message is required."
      );
    }

    console.log("🤖 Calling Groq API...");

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },

      ...(history || [])
        .slice(-MAX_HISTORY_MESSAGES)
        .filter(
  item =>
    item &&
    ["system", "user", "assistant"].includes(item.role) &&
    item.content
),

      {
        role: "user",
        content: message,
      },
    ];

    await groq.chat.completions.create({
  model: MODEL,
  temperature: 0.7,
  max_completion_tokens: 500,
  messages,
});

    const reply =
      completion?.choices?.[0]?.message?.content?.trim();

    console.log("✅ Groq Reply:");
    console.log(reply);

    return (
      reply ||
      "Sorry, I couldn't generate a reply."
    );
  } catch (err) {
    console.error(
      "❌ GROQ ERROR:"
    );

    console.error(
      err?.message || err
    );

    if (err?.response?.data) {
      console.error(
        err.response.data
      );
    }

    return "Sorry, AI is temporarily unavailable.";
  }
};