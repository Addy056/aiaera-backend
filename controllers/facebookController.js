// backend/controllers/facebookWebhookController.js
import supabase from "../config/supabaseClient.js";
import { getUnifiedAIReply } from "../utils/unifiedAIEngine.js"; // NEW — same engine as preview & public bot
import { sendFacebookMessage } from "../utils/sendFacebookMessage.js";

/**
 * Facebook Messenger Webhook Handler
 * - verifies subscription
 * - prevents duplicate messages
 * - loads chatbot + config + files + integrations
 * - generates AI reply using the unified engine
 */
export const handleFacebookWebhook = async (req, res) => {
  try {
    /* ----------------------------------------------------
       1️⃣ VERIFICATION CALLBACK (Facebook setup)
    ---------------------------------------------------- */
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

    /* ----------------------------------------------------
       2️⃣ BASIC VALIDATION
    ---------------------------------------------------- */
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging) return res.sendStatus(200); // ignore

    const senderId = messaging.sender?.id;
    const pageId = entry?.id;

    // If no sender, ignore
    if (!senderId) return res.sendStatus(200);

    // Ignore delivery receipts & read receipts
    if (messaging.delivery || messaging.read) return res.sendStatus(200);

    const text = messaging.message?.text || null;
    const mid = messaging.message?.mid;

    if (!mid) return res.sendStatus(200);

    /* ----------------------------------------------------
       3️⃣ Prevent duplicate processing
    ---------------------------------------------------- */
    const { data: exists } = await supabase
      .from("messages_handled")
      .select("message_id")
      .eq("message_id", mid)
      .maybeSingle();

    if (exists) return res.sendStatus(200);

    /* ----------------------------------------------------
       4️⃣ Identify User via FB Page ID
    ---------------------------------------------------- */
    const { data: integ } = await supabase
      .from("user_integrations")
      .select("user_id, fb_page_token")
      .eq("fb_page_id", pageId)
      .maybeSingle();

    if (!integ) return res.sendStatus(404);

    const userId = integ.user_id;

    /* ----------------------------------------------------
       5️⃣ Subscription Check
    ---------------------------------------------------- */
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (!sub || new Date(sub.expires_at) < new Date()) {
      await sendFacebookMessage(
        pageId,
        integ.fb_page_token,
        senderId,
        "Your subscription for AI auto-replies has expired. Please renew your plan."
      );
      return res.sendStatus(200);
    }

    /* ----------------------------------------------------
       6️⃣ Text extraction (attachments fallback)
    ---------------------------------------------------- */
    let userMessage = text;

    if (!userMessage && messaging.message?.attachments?.length > 0) {
      userMessage = "Received your attachment!";
    }

    if (!userMessage) return res.sendStatus(200);

    /* ----------------------------------------------------
       7️⃣ Generate AI Reply (Unified Engine)
    ---------------------------------------------------- */
    const aiReply = await getUnifiedAIReply({
      userId,
      message: userMessage,
      channel: "facebook",
    });

    /* ----------------------------------------------------
       8️⃣ Send reply via Facebook Graph API
    ---------------------------------------------------- */
    await sendFacebookMessage(
      pageId,
      integ.fb_page_token,
      senderId,
      aiReply
    );

    /* ----------------------------------------------------
       9️⃣ Store message in DB (for analytics, leads, etc.)
    ---------------------------------------------------- */
    await supabase.from("messages_handled").insert({
      message_id: mid,
      user_id: userId,
      channel: "facebook",
      incoming_text: userMessage,
      reply_text: aiReply,
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error("🔥 Facebook Webhook Error:", err);
    return res.sendStatus(500);
  }
};
