import supabase from "../config/supabaseClient.js";
import { generateAIReply } from "../utils/aiResponder.js";
import { sendWhatsappMessage } from "../utils/sendWhatsappMessage.js";

export const handleWhatsappWebhook = async (req, res) => {
  try {
    // 1) Webhook verification (GET from Meta)
    if (req.method === "GET") {
      const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (!mode || !token) {
        console.warn("❌ WhatsApp verification missing params", { mode, tokenPresent: !!token });
        return res.sendStatus(403);
      }

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ WhatsApp webhook verified!");
        return res.status(200).send(challenge); // Must return raw challenge text
      } else {
        console.warn("❌ WhatsApp verify token mismatch", {
          expected: !!VERIFY_TOKEN ? "<set>" : "<missing>",
          gotTokenPresent: !!token,
          mode,
        });
        return res.sendStatus(403);
      }
    }

    // 2) Incoming events (POST from Meta)
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;

    // Ignore non-message events (e.g., status updates, template updates)
    const message = change?.messages?.[0];
    const numberId = change?.metadata?.phone_number_id;

    if (!message || !numberId) {
      // Always 200 so Meta doesn't retry; just nothing to handle
      return res.sendStatus(200);
    }

    const messageId = message.id;
    const from = message.from;
    const text = message.text?.body || "";

    // 3) Prevent duplicate replies
    const { data: existing, error: existingErr } = await supabase
      .from("messages_handled")
      .select("message_id")
      .eq("message_id", messageId)
      .maybeSingle();

    if (existingErr) {
      console.error("❌ Supabase check duplicate error:", existingErr.message);
      // Still proceed; don't block replies just because of a read error
    }
    if (existing) return res.sendStatus(200);

    // 4) Identify business owner (per-user credentials)
    const { data: user, error: userErr } = await supabase
      .from("user_integrations")
      .select("user_id, whatsapp_token, whatsapp_number_id")
      .eq("whatsapp_number_id", numberId)
      .single();

    if (userErr || !user) {
      console.warn("❌ No user matched for phone_number_id", { numberId, userErr: userErr?.message });
      return res.sendStatus(404);
    }

    // 5) Generate AI response
    let aiResponse = "Thanks for your message! 👋";
    try {
      aiResponse = await generateAIReply(user.user_id, text);
    } catch (aiErr) {
      console.error("❌ AI generation error:", aiErr?.message);
    }

    // 6) Send reply using the owner's token
    try {
      await sendWhatsappMessage(numberId, user.whatsapp_token, from, aiResponse);
    } catch (sendErr) {
      console.error("❌ Error sending WhatsApp message:", sendErr?.response?.data || sendErr?.message);
      // Still mark handled to avoid loops if Meta retries
    }

    // 7) Mark message as handled
    const { error: insertErr } = await supabase.from("messages_handled").insert({
      user_id: user.user_id,
      message_id: messageId,
    });
    if (insertErr) console.error("❌ Supabase insert handled error:", insertErr.message);

    return res.sendStatus(200);
  } catch (error) {
    console.error("❌ WhatsApp webhook error:", error.message);
    return res.sendStatus(500);
  }
};
