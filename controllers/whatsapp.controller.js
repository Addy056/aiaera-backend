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
        "❌ WEBHOOK VERIFY ERROR:",
        err.message
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
      FAST ACKNOWLEDGEMENT
      ========================================
      */
      res.sendStatus(200);

      /*
      ========================================
      VALIDATE EVENT
      ========================================
      */
      const messageData =
        body?.entry?.[0]
          ?.changes?.[0]
          ?.value?.messages?.[0];

      if (!messageData) {

        console.log(
          "⚠️ No message data"
        );

        return;
      }

      /*
      ========================================
      IGNORE NON TEXT MESSAGES
      ========================================
      */
      if (
        messageData.type !==
        "text"
      ) {

        console.log(
          "⚠️ Non-text message ignored"
        );

        return;
      }

      const value =
        body.entry[0]
          .changes[0]
          .value;

      /*
      ========================================
      GET MESSAGE DETAILS
      ========================================
      */
      const phoneNumberId =
        value?.metadata
          ?.phone_number_id;

      const userMessage =
        messageData?.text?.body
          ?.trim();

      const customerPhone =
        messageData.from;

      const profileName =
        value?.contacts?.[0]
          ?.profile?.name ||
        "WhatsApp User";

      const messageId =
        messageData.id;

      console.log(
        "📨 MESSAGE:",
        userMessage
      );

      console.log(
        "👤 CUSTOMER:",
        profileName
      );

      console.log(
        "📞 PHONE:",
        customerPhone
      );

      if (!userMessage) {
        return;
      }

      /*
      ========================================
      DUPLICATE MESSAGE CHECK
      ========================================
      */
      const {
        data: existingMessage,
      } = await supabase
        .from(
          "messages_handled"
        )
        .select("id")
        .eq(
          "message_id",
          messageId
        )
        .maybeSingle();

      if (existingMessage) {

        console.log(
          "⚠️ Duplicate webhook ignored"
        );

        return;
      }

      await supabase
        .from(
          "messages_handled"
        )
        .insert([
          {
            message_id:
              messageId,
          },
        ]);

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
          "❌ No WhatsApp integration found"
        );

        console.error(
          integrationError
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
          "⚠️ WhatsApp automation disabled"
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
          "❌ WhatsApp token missing"
        );

        return;
      }

      /*
      ========================================
      CHECK SUBSCRIPTION
      ========================================
      */
      const {
        data: subscription,
      } = await supabase
        .from(
          "user_subscriptions"
        )
        .select("*")
        .eq(
          "user_id",
          integration.user_id
        )
        .single();

      if (
        subscription?.expires_at &&
        new Date(
          subscription.expires_at
        ) < new Date()
      ) {

        console.log(
          "❌ Subscription expired"
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
          "❌ Chatbot not found"
        );

        console.error(
          chatbotError
        );

        return;
      }

      /*
      ========================================
      SAVE LEAD
      ========================================
      */
      try {

        const leadMessage = `
WhatsApp Lead

Phone:
${customerPhone}

Message:
${userMessage}
`;

        const {
          error: leadError,
        } = await supabase
          .from("leads")
          .insert([
            {
              user_id:
                integration.user_id,

              chatbot_id:
                chatbot.id,

              name:
                profileName,

              email:
                `${customerPhone}@whatsapp.aiaera`,

              message:
                leadMessage,
            },
          ]);

        if (leadError) {

          console.error(
            "❌ LEAD SAVE ERROR:",
            leadError
          );

        } else {

          console.log(
            "✅ WhatsApp lead saved"
          );
        }

      } catch (leadErr) {

        console.error(
          "❌ LEAD ERROR:",
          leadErr
        );
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
- Sound human
- Never say you are AI
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
          "❌ GROQ ERROR:",
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

          to:
            customerPhone,

          text: {
            body:
              aiReply,
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
        "❌ WHATSAPP WEBHOOK ERROR:",
        err.response?.data ||
        err.message ||
        err
      );
    }
  };