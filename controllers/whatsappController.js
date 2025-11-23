// backend/controllers/handleWhatsappWebhook.js
import axios from "axios";
import supabase from "../config/supabaseClient.js";
import { generateAIReply } from "../utils/aiResponder.js";
import { sendWhatsappMessage } from "../utils/sendWhatsappMessage.js";

export const handleWhatsappWebhook = async (req, res) => {
  try {
    /* -------------------------------------------------
     * 1️⃣ WEBHOOK VERIFICATION (Meta GET request)
     * ------------------------------------------------- */
    if (req.method === "GET") {
      const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ WhatsApp webhook verified");
        return res.status(200).send(challenge);
      }

      console.warn("❌ WhatsApp webhook verification failed");
      return res.sendStatus(403);
    }

    /* -------------------------------------------------
     * 2️⃣ INCOMING MESSAGE PAYLOAD (Meta POST request)
     * ------------------------------------------------- */
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;

    if (!change?.messages?.length || !change?.metadata?.phone_number_id) {
      return res.sendStatus(200);
    }

    const message = change.messages[0];
    const numberId = change.metadata.phone_number_id; // The business' WA number
    const from = message.from;
    const messageId = message.id;

    const text =
      message.text?.body ||
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      ""; // Fallback to empty

    /* -------------------------------------------------
     * 3️⃣ PREVENT DUPLICATE REPLIES
     * ------------------------------------------------- */
    const { data: exists } = await supabase
      .from("messages_handled")
      .select("message_id")
      .eq("message_id", messageId)
      .maybeSingle();

    if (exists) return res.sendStatus(200);

    /* -------------------------------------------------
     * 4️⃣ FIND BUSINESS OWNER BY whatsapp_number
     * ------------------------------------------------- */
    const { data: integ, error: integErr } = await supabase
      .from("user_integrations")
      .select(
        `
        *,
        user_subscriptions ( expires_at )
        `
      )
      .eq("whatsapp_number", numberId)
      .maybeSingle();

    if (integErr || !integ) {
      console.warn("❌ No matching business for WA number:", numberId);
      return res.sendStatus(200);
    }

    /* -------------------------------------------------
     * 5️⃣ CHECK SUBSCRIPTION IS ACTIVE
     * ------------------------------------------------- */
    const expiresAt = integ.user_subscriptions?.expires_at;
    const isActive = expiresAt && new Date(expiresAt) > new Date();

    if (!isActive) {
      console.warn(`⚠️ Subscription expired for user ${integ.user_id}`);
      return res.sendStatus(200);
    }

    /* -------------------------------------------------
     * 6️⃣ GENERATE AI REPLY
     * ------------------------------------------------- */
    let reply = "Thanks for your message! 😊";

    try {
      reply = await generateAIReply(integ.user_id, text);
    } catch (err) {
      console.error("❌ AI Reply error:", err.message);
    }

    /* -------------------------------------------------
     * 7️⃣ SEND REPLY BACK TO USER
     * ------------------------------------------------- */
    try {
      await sendWhatsappMessage(numberId, integ.whatsapp_token, from, reply);
      console.log(`✅ WA reply sent to ${from}`);
    } catch (sendErr) {
      console.error("❌ WhatsApp send error:", sendErr?.response?.data || sendErr.message);
    }

    /* -------------------------------------------------
     * 8️⃣ MARK MESSAGE AS HANDLED
     * ------------------------------------------------- */
    const { error: insertErr } = await supabase.from("messages_handled").insert({
      user_id: integ.user_id,
      message_id: messageId,
    });

    if (insertErr) {
      console.error("❌ Failed to store handled message:", insertErr.message);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ WhatsApp webhook error:", err.message);
    return res.sendStatus(500);
  }
};
