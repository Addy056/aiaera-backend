// backend/controllers/metaWebhookController.js
import axios from "axios";
import supabase from "../config/supabaseClient.js";

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
 * 2) HANDLE META (WA / FB / IG) MESSAGES
 * ------------------------------------------------------ */
export const handleMetaWebhook = async (req, res) => {
  try {
    const GRAPH_VERSION = process.env.META_API_VERSION || "v19.0";
    const body = req.body;

    // Always acknowledge ASAP to avoid Meta retries
    res.sendStatus(200);

    if (!body.object || !Array.isArray(body.entry)) return;

    for (const entry of body.entry) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        const phoneNumberId = value.metadata?.phone_number_id; // WA number ID
        const messages = value.messages || [];

        if (!messages.length || !phoneNumberId) continue;

        for (const msg of messages) {
          const from = msg.from; // sender phone/id
          const text =
            msg.text?.body ||
            msg.message?.text ||
            msg.message ||
            "";

          const messageId = msg.id;
          if (!from || !messageId) continue;

          /* ----------------------------------------
           * A) Prevent duplicate replies
           * ---------------------------------------- */
          const { data: handled } = await supabase
            .from("messages_handled")
            .select("message_id")
            .eq("message_id", messageId)
            .maybeSingle();

          if (handled) continue;

          /* ----------------------------------------
           * B) Look up integration (WhatsApp)
           * ---------------------------------------- */
          const { data: integ, error: integErr } = await supabase
            .from("user_integrations")
            .select(
              `
              *,
              user_subscriptions ( expires_at )
            `
            )
            .eq("whatsapp_number", phoneNumberId)
            .maybeSingle();

          if (integErr) {
            console.error("❌ Integration lookup error:", integErr.message);
            continue;
          }

          if (!integ) {
            console.warn(
              `⚠️ No integration found for WA phone_number_id: ${phoneNumberId}`
            );
            continue;
          }

          /* ----------------------------------------
           * C) Check Subscription
           * ---------------------------------------- */
          const expires = integ.user_subscriptions?.expires_at;
          const isActive = expires && new Date(expires) > new Date();

          if (!isActive) {
            console.warn(
              `⚠️ Subscription expired for user ${integ.user_id}`
            );
            continue;
          }

          /* ----------------------------------------
           * D) Generate reply
           * ---------------------------------------- */
          let replyText =
            integ.auto_reply_message ||
            `Thanks for messaging us!`;

          // Smart rules
          const lc = text.toLowerCase();

          // If user asks for location
          if (lc.includes("where") || lc.includes("location")) {
            if (integ.business_address) {
              replyText = `📍 Our location:\n${integ.business_address}`;
            }
          }

          // If user asks for booking
          if (
            ["book", "appointment", "schedule", "meeting", "demo"].some((k) =>
              lc.includes(k)
            )
          ) {
            if (integ.calendly_link) {
              replyText = `📅 Book a meeting:\n${integ.calendly_link}`;
            } else {
              replyText =
                "We don't have a booking link added yet. You can message us your preferred timing.";
            }
          }

          /* ----------------------------------------
           * E) Send Auto Reply (WhatsApp)
           * ---------------------------------------- */
          try {
            await axios.post(
              `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
              {
                messaging_product: "whatsapp",
                to: from,
                text: { body: replyText },
              },
              {
                headers: {
                  Authorization: `Bearer ${integ.whatsapp_token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log(`✅ Auto-replied to: ${from}`);
          } catch (sendErr) {
            console.error("❌ Failed to send WA reply:", sendErr.message);
            continue;
          }

          /* ----------------------------------------
           * F) Mark Message as Handled
           * ---------------------------------------- */
          await supabase.from("messages_handled").insert({
            message_id: messageId,
            user_id: integ.user_id,
          });
        }
      }
    }
  } catch (err) {
    console.error("❌ Meta webhook processing error:", err.message);
  }
};
