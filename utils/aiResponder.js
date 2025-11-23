// backend/utils/aiResponder.js
import Groq from "groq-sdk";
import supabase from "../config/supabaseClient.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateAIReply(userId, message) {
  try {
    /* ---------------------------------------------------
     * 1️⃣ Load business details (best available source)
     * --------------------------------------------------- */
    const { data: businessData } = await supabase
      .from("business_data")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const description =
      businessData?.description ||
      businessData?.title ||
      "We provide helpful business services.";

    const address = integrations?.business_address || null;

    let mapsLink = null;
    if (integrations?.business_lat && integrations?.business_lng) {
      mapsLink = `https://www.google.com/maps?q=${integrations.business_lat},${integrations.business_lng}`;
    }

    /* ---------------------------------------------------
     * 2️⃣ Build the system prompt (business persona)
     * --------------------------------------------------- */
    const systemPrompt = `
You are the official AI assistant for this business.

🏢 BUSINESS CONTEXT
- Description: ${description}
- Address: ${address || "Not provided"}
- Maps: ${mapsLink || "Not available"}

🎯 RULES
- Speak as the business: use "we" / "our company".
- Stay friendly, helpful, and professional.
- DO NOT mention "AI", "assistant", or "chatbot".
- If user asks unrelated things (math, jokes, code),
  politely guide them back to the business.
- If user asks for location, return the address & maps link.
- Keep answers SHORT (1–3 lines).
`;

    /* ---------------------------------------------------
     * 3️⃣ Groq API call (correct endpoint + model)
     * --------------------------------------------------- */
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.4,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();

    return reply || "Thanks for reaching out! How can we help you today?";
  } catch (err) {
    console.error("❌ AI generation error:", err.message);
    return "Thanks for reaching out! Our team will reply shortly.";
  }
}
