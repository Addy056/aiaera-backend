import supabase from "../config/supabaseClient.js";
import { generateAIReply } from "../utils/aiResponder.js";
import { sendWhatsappMessage } from "../utils/sendWhatsappMessage.js";

export const handleWhatsappWebhook = async (req, res) => {
  try {
    // 1️⃣ Handle verification challenge
    if (req.method === "GET") {
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];
      if (mode && token === verifyToken) return res.status(200).send(challenge);
      else return res.sendStatus(403);
    }

    // 2️⃣ Handle incoming message
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    const numberId = change?.metadata?.phone_number_id;

    if (!message) return res.sendStatus(200);

    const messageId = message.id;
    const from = message.from;
    const text = message.text?.body || "";

    // 3️⃣ Prevent duplicate replies
    const { data: existing } = await supabase
      .from("messages_handled")
      .select("message_id")
      .eq("message_id", messageId)
      .maybeSingle();

    if (existing) return res.sendStatus(200);

    // 4️⃣ Identify business owner
    const { data: user } = await supabase
      .from("user_integrations")
      .select("user_id, whatsapp_token, whatsapp_number_id")
      .eq("whatsapp_number_id", numberId)
      .single();

    if (!user) return res.sendStatus(404);

    // 5️⃣ Generate AI response
    const aiResponse = await generateAIReply(user.user_id, text);

    // 6️⃣ Send reply using their token
    await sendWhatsappMessage(numberId, user.whatsapp_token, from, aiResponse);

    // 7️⃣ Mark message as handled
    await supabase.from("messages_handled").insert({
      user_id: user.user_id,
      message_id: messageId,
    });

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ WhatsApp webhook error:", error.message);
    res.sendStatus(500);
  }
};
