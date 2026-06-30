import { supabase }
  from "../config/supabaseClient.js";

import {
  sendWhatsAppMessage,
} from "../services/meta.service.js";

import {
  sendFacebookMessage,
} from "../services/facebook.service.js";

import {
  sendInstagramMessage,
} from "../services/instagram.service.js";

import {
  generateAIReply,
} from "../services/aiReply.service.js";

import {
  isDuplicateMessage,
  markMessageHandled,
  saveLead,
} from "../utils/messageProcessor.js";

/*
========================================
COMMON VERIFY TOKEN
========================================
*/
const VERIFY_TOKEN =
  process.env
    .WHATSAPP_VERIFY_TOKEN;

/*
========================================
VERIFY WEBHOOK
========================================
*/
const verifyWebhook =
  (req, res) => {

    const mode =
      req.query["hub.mode"];

    const token =
      req.query["hub.verify_token"];

    const challenge =
      req.query["hub.challenge"];

    console.log("====================================");
    console.log("VERIFY WEBHOOK");
    console.log("Mode:", mode);
    console.log("Token:", token);
    console.log("Expected Token:", VERIFY_TOKEN);
    console.log("Challenge:", challenge);
    console.log("====================================");

    if (
      mode === "subscribe" &&
      token === VERIFY_TOKEN
    ) {

      console.log("✅ Verification Successful");

      return res
        .status(200)
        .send(challenge);
    }

    console.log("❌ Verification Failed");

    return res.sendStatus(403);
  };

/*
========================================
WHATSAPP VERIFY
========================================
*/
export const verifyWhatsAppWebhook =
  (req, res) => {

    return verifyWebhook(
      req,
      res
    );
  };

/*
========================================
FACEBOOK VERIFY
========================================
*/
export const verifyFacebookWebhook =
  (req, res) => {

    return verifyWebhook(
      req,
      res
    );
  };

/*
========================================
INSTAGRAM VERIFY
========================================
*/
export const verifyInstagramWebhook =
  (req, res) => {

    return verifyWebhook(
      req,
      res
    );
  };

/*
========================================
GET USER CHATBOT
========================================
*/
const getUserChatbot =
  async (user_id) => {

    const {
      data: chatbot,
    } = await supabase
      .from("chatbots")
      .select("*")
      .eq(
        "user_id",
        user_id
      )
      .limit(1)
      .single();

    return chatbot;
  };

/*
========================================
WHATSAPP WEBHOOK
========================================
*/
export const handleWhatsAppWebhook = async (req, res) => {
  console.log("🔥🔥🔥 WEBHOOK HIT");
  console.log("METHOD:", req.method);
  console.log("BODY:", JSON.stringify(req.body));

  
    try {

      const body =
        req.body;

      if (!body.object) {

        return res.sendStatus(404);
      }

      const value =
        body.entry?.[0]
          ?.changes?.[0]
          ?.value;

      const msg =
        value?.messages?.[0];

      if (!msg) {

        return res.sendStatus(200);
      }

      /*
      ========================================
      MESSAGE INFO
      ========================================
      */
      const messageId =
        msg.id;

      const from =
        msg.from;

      const text =
        msg.text?.body;

      const phone_id =
        value?.metadata
          ?.phone_number_id;

      console.log(
        "Incoming WhatsApp:",
        text
      );

      /*
      ========================================
      DUPLICATE CHECK
      ========================================
      */
      const duplicate =
        await isDuplicateMessage(
          messageId
        );

      if (duplicate) {

        return res.sendStatus(200);
      }

      await markMessageHandled(
        messageId
      );
      console.log("✅ Duplicate check passed");
      /*
      ========================================
      FIND INTEGRATION
      ========================================
      */
      const {
        data: integration,
      } = await supabase
        .from(
          "user_integrations"
        )
        .select("*")
        .eq(
          "whatsapp_phone_id",
          phone_id
        )
        .single();

      if (
        !integration ||
        !integration.whatsapp_enabled
      ) {

        return res.sendStatus(200);
      }

      /*
      ========================================
      FIND CHATBOT
      ========================================
      */
      const chatbot =
        await getUserChatbot(
          integration.user_id
        );

      if (!chatbot) {

        return res.sendStatus(200);
      }

      /*
      ========================================
      SAVE LEAD
      ========================================
      */
      await saveLead({

        user_id:
          integration.user_id,

        chatbot_id:
          chatbot.id,

        phone: from,

        message: text,
      });

      /*
      ========================================
      GENERATE AI REPLY
      ========================================
      */
      const reply =
        await generateAIReply({

          message: text,

          chatbot_id:
            chatbot.id,

          session_id: from,
        });

      /*
========================================
DEBUG
========================================
*/
console.log("========================================");
console.log("Incoming WhatsApp:", text);
console.log("Phone:", from);
console.log("Phone Number ID:", integration.whatsapp_phone_id);
console.log(
  "Access Token Available:",
  !!integration.whatsapp_access_token
);
console.log("Chatbot:", chatbot.name);
console.log("AI Reply:", reply);
console.log("========================================");

/*
========================================
SEND REPLY
========================================
*/
const result =
  await sendWhatsAppMessage({

    phoneNumberId:
      integration.whatsapp_phone_id,

    accessToken:
      integration.whatsapp_access_token,

    to: from,

    message: reply,
  });

console.log("========================================");
console.log("WHATSAPP API RESULT");
console.log(result);
console.log("========================================");

if (!result.success) {

  console.error(
  "❌ WhatsApp send failed:",
  result.error
);

return res.sendStatus(200);
}

console.log("✅ WhatsApp reply sent successfully.");

return res.sendStatus(200);

    } catch (err) {

      console.error(
        "WHATSAPP WEBHOOK ERROR:",
        err.response?.data ||
        err.message
      );

      return res.sendStatus(500);
    }
  };

/*
========================================
FACEBOOK WEBHOOK
========================================
*/
export const handleFacebookWebhook =
  async (req, res) => {

    try {

      const body =
        req.body;

      const messaging =
        body.entry?.[0]
          ?.messaging?.[0];

      if (!messaging) {

        return res.sendStatus(200);
      }

      const senderId =
        messaging.sender?.id;

      const text =
        messaging.message?.text;

      const messageId =
        messaging.message?.mid;

      if (!text) {

        return res.sendStatus(200);
      }

      /*
      ========================================
      DUPLICATE CHECK
      ========================================
      */
      const duplicate =
        await isDuplicateMessage(
          messageId
        );

      if (duplicate) {

        return res.sendStatus(200);
      }

      await markMessageHandled(
        messageId
      );

      /*
      ========================================
      FIND INTEGRATION
      ========================================
      */
      const {
        data: integration,
      } = await supabase
        .from(
          "user_integrations"
        )
        .select("*")
        .eq(
          "facebook_enabled",
          true
        )
        .limit(1)
        .single();

      if (!integration) {

        return res.sendStatus(200);
      }

      /*
      ========================================
      FIND CHATBOT
      ========================================
      */
      const chatbot =
        await getUserChatbot(
          integration.user_id
        );

      if (!chatbot) {

        return res.sendStatus(200);
      }

      /*
      ========================================
      GENERATE AI REPLY
      ========================================
      */
      const reply =
        await generateAIReply({

          message: text,

          chatbot_id:
            chatbot.id,

          session_id:
            senderId,
        });

      /*
      ========================================
      SEND MESSAGE
      ========================================
      */
      await sendFacebookMessage({

        pageToken:
          integration.facebook_page_access_token,

        recipientId:
          senderId,

        message:
          reply,
      });

      return res.sendStatus(200);

    } catch (err) {

      console.error(
        "FACEBOOK WEBHOOK ERROR:",
        err.response?.data ||
        err.message
      );

      return res.sendStatus(500);
    }
  };

/*
========================================
INSTAGRAM WEBHOOK
========================================
*/
export const handleInstagramWebhook =
  async (req, res) => {

    try {

      const body =
        req.body;

      const messaging =
        body.entry?.[0]
          ?.messaging?.[0];

      if (!messaging) {

        return res.sendStatus(200);
      }

      const senderId =
        messaging.sender?.id;

      const text =
        messaging.message?.text;

      const messageId =
        messaging.message?.mid;

      if (!text) {

        return res.sendStatus(200);
      }

      /*
      ========================================
      DUPLICATE CHECK
      ========================================
      */
      const duplicate =
        await isDuplicateMessage(
          messageId
        );

      if (duplicate) {

        return res.sendStatus(200);
      }

      await markMessageHandled(
        messageId
      );

      /*
      ========================================
      FIND INTEGRATION
      ========================================
      */
      const {
        data: integration,
      } = await supabase
        .from(
          "user_integrations"
        )
        .select("*")
        .eq(
          "instagram_enabled",
          true
        )
        .limit(1)
        .single();

      if (!integration) {

        return res.sendStatus(200);
      }

      /*
      ========================================
      FIND CHATBOT
      ========================================
      */
      const chatbot =
        await getUserChatbot(
          integration.user_id
        );

      if (!chatbot) {

        return res.sendStatus(200);
      }

      /*
      ========================================
      GENERATE AI REPLY
      ========================================
      */
      const reply =
        await generateAIReply({

          message: text,

          chatbot_id:
            chatbot.id,

          session_id:
            senderId,
        });

      /*
      ========================================
      SEND MESSAGE
      ========================================
      */
      await sendInstagramMessage({

        accessToken:
          integration.instagram_access_token,

        recipientId:
          senderId,

        message:
          reply,
      });

      return res.sendStatus(200);

    } catch (err) {

      console.error(
        "INSTAGRAM WEBHOOK ERROR:",
        err.response?.data ||
        err.message
      );

      return res.sendStatus(500);
    }
  };