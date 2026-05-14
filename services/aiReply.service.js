import {
  generateAIReply as generateGroqReply,
} from "./groq.service.js";

import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
GENERATE AI REPLY
========================================
*/
export const generateAIReply =
  async ({

    message,
    chatbot_id,
    session_id,

  }) => {

    try {

      /*
      ========================================
      GET CHATBOT
      ========================================
      */
      const {
        data: chatbot,
      } = await supabase
        .from("chatbots")
        .select("*")
        .eq(
          "id",
          chatbot_id
        )
        .single();

      if (!chatbot) {

        return "Chatbot not found.";
      }

      /*
      ========================================
      BUILD PROMPT
      ========================================
      */
      const systemPrompt = `
You are an AI assistant for a business.

Business Name:
${chatbot.name || "Business"}

Business Description:
${chatbot.business_description || ""}

Your job:
- Answer customer questions
- Be helpful and professional
- Keep responses concise
- Encourage leads and bookings
`;

      /*
      ========================================
      FINAL PROMPT
      ========================================
      */
      const finalPrompt = `
${systemPrompt}

Customer Message:
${message}
`;

      /*
      ========================================
      GENERATE REPLY
      ========================================
      */
      const reply =
        await generateGroqReply(
          finalPrompt
        );

      return reply;

    } catch (err) {

      console.error(
        "AI REPLY SERVICE ERROR:",
        err.message
      );

      return "Sorry, AI is temporarily unavailable.";
    }
  };