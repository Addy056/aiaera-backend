import axios from "axios";

import Groq from "groq-sdk";

import { supabase }
  from "../config/supabaseClient.js";

const groq = new Groq({
  apiKey:
    process.env.GROQ_API_KEY,
});

/*
========================================
VERIFY WEBHOOK
========================================
*/
export const verifyWebhook =
  async (req, res) => {

    try {

      const mode =
        req.query[
          "hub.mode"
        ];

      const token =
        req.query[
          "hub.verify_token"
        ];

      const challenge =
        req.query[
          "hub.challenge"
        ];

      /*
      ========================================
      VERIFY TOKEN
      ========================================
      */
      if (
        mode ===
          "subscribe" &&
        token ===
          process.env
            .WHATSAPP_VERIFY_TOKEN
      ) {

        console.log(
          "✅ WhatsApp webhook verified"
        );

        return res
          .status(200)
          .send(challenge);
      }

      return res
        .status(403)
        .send("Verification failed");

    } catch (err) {

      console.error(
        "WEBHOOK VERIFY ERROR:",
        err
      );

      return res
        .status(500)
        .send("Server error");
    }
  };

/*
========================================
RECEIVE WHATSAPP EVENTS
========================================
*/
export const receiveWebhook =
  async (req, res) => {

    try {

      /*
      ========================================
      META WEBHOOK DATA
      ========================================
      */
      const body =
        req.body;

      console.log(
        "📩 WHATSAPP EVENT:",
        JSON.stringify(
          body,
          null,
          2
        )
      );

      /*
      ========================================
      ACKNOWLEDGE FAST
      ========================================
      */
      res.sendStatus(200);

      /*
      ========================================
      VALIDATE EVENT
      ========================================
      */
      if (
        !body.entry?.[0]
          ?.changes?.[0]
          ?.value?.messages?.[0]
      ) {

        return;
      }

      const change =
        body.entry[0]
          .changes[0];

      const value =
        change.value;

      const messageData =
        value.messages[0];

      /*
      ========================================
      GET PHONE NUMBER ID
      ========================================
      */
      const phoneNumberId =
        value?.metadata
          ?.phone_number_id;

      console.log(
        "📞 PHONE NUMBER ID:",
        phoneNumberId
      );

      /*
      ========================================
      USER MESSAGE
      ========================================
      */
      const userMessage =
        messageData?.text?.body;

      /*
      ========================================
      USER PHONE
      ========================================
      */
      const from =
        messageData.from;

      if (!userMessage) {

        console.log(
          "No text message found"
        );

        return;
      }

      console.log(
        "📨 MESSAGE:",
        userMessage
      );

      /*
      ========================================
      GET USER INTEGRATION
      ========================================
      */
      const {
        data: integration,
        error: integrationError,
      } = await supabase
        .from(
          "user_integrations"
        )
        .select("*")
        .eq(
          "whatsapp_phone_id",
          phoneNumberId
        )
        .single();

      if (
        integrationError ||
        !integration
      ) {

        console.error(
          "No WhatsApp integration found"
        );

        return;
      }

      /*
      ========================================
      AUTOMATION DISABLED
      ========================================
      */
      if (
        !integration.whatsapp_enabled
      ) {

        console.log(
          "WhatsApp automation disabled"
        );

        return;
      }

      /*
      ========================================
      TOKEN CHECK
      ========================================
      */
      if (
        !integration.whatsapp_token
      ) {

        console.error(
          "WhatsApp token missing"
        );

        return;
      }

      /*
      ========================================
      GET USER CHATBOT
      ========================================
      */
      const {
        data: chatbot,
        error: chatbotError,
      } = await supabase
        .from("chatbots")
        .select("*")
        .eq(
          "user_id",
          integration.user_id
        )
        .limit(1)
        .single();

      if (
        chatbotError ||
        !chatbot
      ) {

        console.error(
          "Chatbot not found"
        );

        return;
      }

      /*
      ========================================
      SYSTEM PROMPT
      ========================================
      */
      const systemPrompt = `
You are an AI customer support assistant for ${
        chatbot?.bot_name ||
        "AIAERA"
      }.

Business Information:
${
  chatbot?.business_info ||
  "No business info available"
}

Rules:
- Be friendly
- Keep replies short
- Answer professionally
- Help customers clearly
`;

      /*
      ========================================
      GENERATE AI RESPONSE
      ========================================
      */
      let aiReply =
        "Hello! How can I help you today?";

      try {

        const completion =
          await groq.chat.completions.create(
            {
              model:
                "llama-3.1-8b-instant",

              messages: [
                {
                  role:
                    "system",

                  content:
                    systemPrompt,
                },
                {
                  role:
                    "user",

                  content:
                    userMessage,
                },
              ],

              temperature:
                0.7,

              max_tokens:
                300,
            }
          );

        aiReply =
          completion
            ?.choices?.[0]
            ?.message
            ?.content ||
          aiReply;

      } catch (groqError) {

        console.error(
          "GROQ ERROR:",
          groqError.message
        );
      }

      /*
      ========================================
      SEND WHATSAPP REPLY
      ========================================
      */
      await axios.post(

        `https://graph.facebook.com/v19.0/${integration.whatsapp_phone_id}/messages`,

        {
          messaging_product:
            "whatsapp",

          to: from,

          text: {
            body: aiReply,
          },
        },

        {
          headers: {

            Authorization:
              `Bearer ${integration.whatsapp_token}`,

            "Content-Type":
              "application/json",
          },
        }
      );

      console.log(
        "✅ WhatsApp reply sent"
      );

    } catch (err) {

      console.error(
        "WHATSAPP WEBHOOK ERROR:",
        err.response?.data ||
        err.message ||
        err
      );
    }
  };