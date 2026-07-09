import {
  generateAIReply as generateGroqReply,
} from "./groq.service.js";

import {
  supabase,
} from "../config/supabaseClient.js";

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
        error: chatbotError,
      } = await supabase
        .from("chatbots")
        .select("*")
        .eq(
          "id",
          chatbot_id
        )
        .single();

      if (
        chatbotError ||
        !chatbot
      ) {

        console.error(
          "CHATBOT ERROR:",
          chatbotError
        );

        return "Chatbot not found.";
      }

      /*
      ========================================
      GET USER INTEGRATIONS
      ========================================
      */
      const {
        data: integrations,
        error: integrationError,
      } = await supabase
        .from("user_integrations")
        .select(`
          maps_link,
          meeting_provider,
          meeting_link
        `)
        .eq(
          "user_id",
          chatbot.user_id
        )
        .maybeSingle();

      if (integrationError) {

        console.error(
          "INTEGRATION ERROR:",
          integrationError
        );
      }

      /*
      ========================================
      BUSINESS DATA
      ========================================
      */
      const businessLocation =
        integrations?.maps_link ||
        "Not provided";

      const meetingProvider =
        integrations?.meeting_provider ||
        "Not configured";

      const meetingLink =
        integrations?.meeting_link ||
        "Not configured";

      /*
      ========================================
      BUILD SYSTEM PROMPT
      ========================================
      */
      const systemPrompt = `
You are an intelligent AI assistant representing a business.

Business Name:
${chatbot.name || "Business"}

Business Description:
${chatbot.business_description || "Not provided"}

Business Location:
${businessLocation}

Meeting Provider:
${meetingProvider}

Meeting Link:
${meetingLink}

YOUR RESPONSIBILITIES

- Answer customer questions accurately.
- Be friendly, professional and concise.
- Help customers understand the business.
- Encourage leads and bookings whenever appropriate.

IMPORTANT RULES

- NEVER invent or guess business information.
- NEVER create fake addresses.
- NEVER generate placeholder addresses like:
  "123 Main St",
  "Suite 400",
  "Anytown",
  or similar.
- If Business Location exists above, always use it exactly as provided.
- If Business Location is "Not provided", politely tell the customer that the business has not provided its location.
- If Meeting Link exists, use it whenever the customer wants to book a meeting.
- If Meeting Link is not configured, politely inform the customer.
- If you don't know something, say you don't know instead of making it up.
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
      GENERATE AI RESPONSE
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
        err
      );

      return "Sorry, AI is temporarily unavailable.";
    }
  };