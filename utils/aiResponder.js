import axios from "axios";
import supabase from "../config/supabaseClient.js";

export async function generateAIReply(userId, message) {
  try {
    // Fetch business info from Supabase
    const { data: business } = await supabase
      .from("business_data")
      .select("description")
      .eq("user_id", userId)
      .single();

    const prompt = `
You are an AI assistant for a business.
Business description: "${business?.description || "No info"}"
User message: "${message}"
Reply naturally and professionally, based on the business context.
`;

    // Groq API call
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("AI generation error:", error.message);
    return "Sorry, I couldn't generate a reply right now.";
  }
}
