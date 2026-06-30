import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const generateAIReply = async (prompt) => {

  try {

    console.log("🤖 Calling Groq API...");

    const completion =
      await groq.chat.completions.create({

        model: "llama3-70b-8192",

        temperature: 0.7,

        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    const reply =
      completion?.choices?.[0]?.message?.content;

    console.log("✅ Groq Reply:");
    console.log(reply);

    return reply || "Sorry, I couldn't generate a reply.";

  } catch (err) {

    console.error("❌ GROQ ERROR");
    console.error(err);

    return "Sorry, AI is temporarily unavailable.";
  }
};