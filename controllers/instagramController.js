// backend/controllers/instagramWebhookController.js
import supabase from "../config/supabaseClient.js";
import { generateAIReply } from "../utils/aiResponder.js";
import { sendInstagramMessage } from "../utils/sendInstagramMessage.js";

/**
 * Instagram Messaging Webhook Handler
 * Supports:
 * - Verification (GET)
 * - Auto-replies (POST)
 */
export const handleInstagramWebhook = async (req, res) => {
  try {
    /* -------------------------------------------
       1️⃣ Instagram Verification (GET)
    -------------------------------------------- */
    if (req.method === "GET") {
      const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
      }
      return res.sendStatus(403);
    }

    /* -------------------------------------------
       2️⃣ Parse Incoming Message (POST)
       Instagram sends messages under `changes`
    -------------------------------------------- */
    const changes = req.body.entry?.[0]?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.length) {
      return res.sendStatus(200); // nothing to process
    }

    const message = value.messages[0];

    const senderId = message.from;   // IG user sending the message
    const text = message.text || "";
    const messageId = message.id;

    const instagramUserId = value?.messaging_product === "instagram"
      ? value.metadata?.instagram_user_id || value?.sender?.id || value?.id
      : null;

    if (!senderId || !text) return res.sendStatus(200);

    /* -------------------------------------------
       3️⃣ Prevent duplicate processing
    -------------------------------------------- */
    const { data: existing } = await supabase
      .from("messages_handled")
      .select("message_id")
      .eq("message_id", messageId)
      .maybeSingle();

    if (existing) return res.sendStatus(200);

    /* -------------------------------------------
       4️⃣ Identify which AIAERA user owns this IG account
       (instagram_user_id must be stored in user_integrations)
    -------------------------------------------- */
    const { data: user } = await supabase
      .from("user_integrations")
      .select("user_id, instagram_access_token, instagram_user_id")
      .eq("instagram_user_id", instagramUserId)
      .maybeSingle();

    if (!user) {
      console.warn("⚠️ No user mapped for Instagram account:", instagramUserId);
      return res.sendStatus(404);
    }

    /* -------------------------------------------
       5️⃣ Generate AI Reply (Unified AIAERA Logic)
    -------------------------------------------- */
    const aiReply = await generateAIReply(user.user_id, text);

    /* -------------------------------------------
       6️⃣ Send reply using IG Graph API
    -------------------------------------------- */
    await sendInstagramMessage(
      user.instagram_user_id,
      user.instagram_access_token,
      senderId,
      aiReply
    );

    /* -------------------------------------------
       7️⃣ Mark message as handled
    -------------------------------------------- */
    await supabase
      .from("messages_handled")
      .insert({
        message_id: messageId,
        user_id: user.user_id,
      });

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Instagram webhook error:", err.message);
    return res.sendStatus(500);
  }
};
