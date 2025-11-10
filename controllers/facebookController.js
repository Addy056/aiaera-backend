import supabase from "../config/supabaseClient.js";
import { generateAIReply } from "../utils/aiResponder.js";
import { sendFacebookMessage } from "../utils/sendFacebookMessage.js";

export const handleFacebookWebhook = async (req, res) => {
  try {
    // ✅ Verification challenge
    if (req.method === "GET") {
      const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
      }
      return res.sendStatus(403);
    }

    // ✅ Handle message events
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging) return res.sendStatus(200);

    const senderId = messaging.sender?.id;
    const pageId = entry?.id;
    const text = messaging.message?.text;

    if (!senderId || !text) return res.sendStatus(200);

    // Check if handled already
    const messageId = messaging.message.mid;
    const { data: existing } = await supabase
      .from("messages_handled")
      .select("message_id")
      .eq("message_id", messageId)
      .maybeSingle();

    if (existing) return res.sendStatus(200);

    // Identify user from fb_page_id
    const { data: user } = await supabase
      .from("user_integrations")
      .select("user_id, fb_page_token")
      .eq("fb_page_id", pageId)
      .single();

    if (!user) return res.sendStatus(404);

    // Generate reply
    const aiReply = await generateAIReply(user.user_id, text);

    // Send via Graph API
    await sendFacebookMessage(pageId, user.fb_page_token, senderId, aiReply);

    // Mark as handled
    await supabase.from("messages_handled").insert({
      message_id: messageId,
      user_id: user.user_id,
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Facebook webhook error:", err.message);
    res.sendStatus(500);
  }
};
