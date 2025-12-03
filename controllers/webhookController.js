import supabase from "../config/supabaseClient.js";
import { sendWhatsappMessage } from "../utils/sendWhatsappMessage.js";
import { sendFacebookMessage } from "../utils/sendFacebookMessage.js";
import { sendInstagramMessage } from "../utils/sendInstagramMessage.js";
import axios from "axios";

/* ------------------------------------------------------
 * 1) VERIFY META WEBHOOK
 * ------------------------------------------------------ */
export const verifyMetaWebhook = (req, res) => {
  try {
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Meta webhook verified");
      return res.status(200).send(challenge);
    }

    console.warn("⚠️ Meta webhook verification failed");
    return res.sendStatus(403);
  } catch (err) {
    console.error("❌ Error verifying Meta webhook:", err.message);
    res.sendStatus(500);
  }
};

/* ------------------------------------------------------
 * 2) HANDLE META (WA / FB / IG)
 * ------------------------------------------------------ */
export const handleMetaWebhook = async (body) => {
  try {
    if (!body?.object || !Array.isArray(body.entry)) return;

    for (const entry of body.entry) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        // ✅ IGNORE DELIVERY / STATUS EVENTS
        if (value.statuses || !value.messages?.length) continue;

        let platform = null;
        let senderId = null;
        let messageText = null;
        let platformIdentifier = null;
        let messageId = null;

        /* ---------------------- */
        /* ✅ WHATSAPP */
        /* ---------------------- */
        if (value.metadata?.phone_number_id && value.messages?.length) {
          const msg = value.messages[0];
          platform = "whatsapp";
          senderId = msg.from;
          messageText = msg.text?.body || "";
          platformIdentifier = value.metadata.phone_number_id; // ✅ PHONE NUMBER ID
          messageId = msg.id;
        }

        /* ---------------------- */
        /* ✅ FACEBOOK */
        /* ---------------------- */
        else if (
          change.field === "messages" &&
          value.sender?.id &&
          value.message?.text
        ) {
          platform = "facebook";
          senderId = value.sender.id;
          messageText = value.message.text;
          platformIdentifier = value.recipient?.id;
          messageId = value.message.mid;
        }

        /* ---------------------- */
        /* ✅ INSTAGRAM */
        /* ---------------------- */
        else if (
          change.field === "instagram" &&
          value.sender?.id &&
          value.message?.text
        ) {
          platform = "instagram";
          senderId = value.sender.id;
          messageText = value.message.text;
          platformIdentifier = value.recipient?.id;
          messageId = value.message.id; // ✅ REAL ID
        }

        if (!platform || !senderId || !messageText || !platformIdentifier || !messageId)
          continue;

        /* ---------------------- */
        /* ✅ DUPLICATE CHECK */
        /* ---------------------- */
        const { data: alreadyHandled } = await supabase
          .from("messages_handled")
          .select("message_id")
          .eq("message_id", messageId)
          .maybeSingle();

        if (alreadyHandled) continue;

        /* ---------------------- */
        /* ✅ GET USER INTEGRATION */
        /* ---------------------- */
        let integrationQuery = supabase
          .from("user_integrations")
          .select("*");

        if (platform === "whatsapp") {
          integrationQuery = integrationQuery.eq(
            "whatsapp_number",
            platformIdentifier
          );
        }

        if (platform === "facebook") {
          integrationQuery = integrationQuery.eq(
            "fb_page_id",
            platformIdentifier
          );
        }

        if (platform === "instagram") {
          integrationQuery = integrationQuery.eq(
            "instagram_page_id",
            platformIdentifier
          );
        }

        const { data: integration } = await integrationQuery.maybeSingle();
        if (!integration) continue;

        /* ---------------------- */
        /* ✅ SUBSCRIPTION CHECK */
        /* ---------------------- */
        const { data: sub } = await supabase
          .from("user_subscriptions")
          .select("expires_at")
          .eq("user_id", integration.user_id)
          .maybeSingle();

        const isActive =
          sub?.expires_at && new Date(sub.expires_at) > new Date();

        if (!isActive) {
          const expiredMsg =
            "⚠️ This business’s AI automation subscription has expired. Please contact the business.";

          if (platform === "whatsapp") {
            await sendWhatsappMessage(
              integration.whatsapp_number,
              integration.whatsapp_token,
              senderId,
              expiredMsg
            );
          }
          if (platform === "facebook") {
            await sendFacebookMessage(
              integration.fb_page_id,
              integration.fb_page_token,
              senderId,
              expiredMsg
            );
          }
          if (platform === "instagram") {
            await sendInstagramMessage(
              integration.instagram_page_id,
              integration.instagram_access_token,
              senderId,
              expiredMsg
            );
          }

          continue;
        }

        /* ---------------------- */
        /* ✅ BOOKING INTENT */
        /* ---------------------- */
        const lc = messageText.toLowerCase();
        const bookingKeywords = [
          "book",
          "appointment",
          "meeting",
          "schedule",
          "demo",
          "call",
        ];

        const isBookingIntent = bookingKeywords.some((k) =>
          lc.includes(k)
        );

        if (isBookingIntent && integration.calendly_link) {
          const bookingReply = `📅 You can book your meeting here:\n${integration.calendly_link}`;

          if (platform === "whatsapp") {
            await sendWhatsappMessage(
              integration.whatsapp_number,
              integration.whatsapp_token,
              senderId,
              bookingReply
            );
          }

          if (platform === "facebook") {
            await sendFacebookMessage(
              integration.fb_page_id,
              integration.fb_page_token,
              senderId,
              bookingReply
            );
          }

          if (platform === "instagram") {
            await sendInstagramMessage(
              integration.instagram_page_id,
              integration.instagram_access_token,
              senderId,
              bookingReply
            );
          }

          await supabase.from("appointments").insert({
            user_id: integration.user_id,
            chatbot_id: null,
            customer_name: null,
            customer_email: null,
            calendly_event_link: integration.calendly_link,
          });
        } else {
          /* ---------------------- */
          /* ✅ AI REPLY (GROQ) */
          /* ---------------------- */
          let replyText = "Thanks for your message!";

          try {
            const aiRes = await axios.post(
              "https://api.groq.com/openai/v1/chat/completions",
              {
                model: "llama3-8b-8192",
                messages: [
                  { role: "system", content: "You are a helpful business assistant." },
                  { role: "user", content: messageText },
                ],
              },
              {
                headers: {
                  Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                  "Content-Type": "application/json",
                },
                timeout: 15000,
              }
            );

            replyText =
              aiRes.data?.choices?.[0]?.message?.content || replyText;
          } catch (aiErr) {
            console.error("❌ Groq AI error:", aiErr.message);
          }

          if (platform === "whatsapp") {
            await sendWhatsappMessage(
              integration.whatsapp_number,
              integration.whatsapp_token,
              senderId,
              replyText
            );
          }

          if (platform === "facebook") {
            await sendFacebookMessage(
              integration.fb_page_id,
              integration.fb_page_token,
              senderId,
              replyText
            );
          }

          if (platform === "instagram") {
            await sendInstagramMessage(
              integration.instagram_page_id,
              integration.instagram_access_token,
              senderId,
              replyText
            );
          }
        }

        // ✅ ALWAYS mark message handled
        await supabase.from("messages_handled").insert({
          message_id: messageId,
          user_id: integration.user_id,
        });
      }
    }
  } catch (err) {
    console.error("❌ Meta webhook processing error:", err.message);
  }
};
