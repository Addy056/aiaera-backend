// backend/controllers/metaWebhookController.js
import axios from "axios";
import supabase from "../config/supabaseClient.js";

/**
 * ------------------------------------------------------
 * 1. META WEBHOOK VERIFICATION
 * ------------------------------------------------------
 */
export const verifyMetaWebhook = (req, res) => {
  try {
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Meta webhook verified");
        return res.status(200).send(challenge);
      } else {
        console.warn("⚠️ Webhook verification failed: invalid token or mode");
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    return res.status(400).json({ error: "Bad request: missing query params" });
  } catch (err) {
    console.error("❌ Error verifying webhook:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * ------------------------------------------------------
 * 2. HANDLE META MESSAGES (WHATSAPP + MESSENGER)
 * ------------------------------------------------------
 */
export const handleMetaWebhook = async (req, res) => {
  try {
    const body = req.body;
    const GRAPH_VERSION = process.env.META_API_VERSION || "v19.0";

    if (!body.object || !body.entry) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    // ✅ Always respond 200 quickly to avoid retries
    res.sendStatus(200);

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];
        if (!messages.length) continue;

        for (const msg of messages) {
          const fromNumber = msg.from;
          const text = msg.text?.body || "";
          const phoneNumberId = change.value.metadata?.phone_number_id;
          const messageId = msg.id;

          if (!phoneNumberId || !messageId) continue;

          try {
            // ✅ Prevent duplicate replies
            const { data: handled, error: handledErr } = await supabase
              .from("messages_handled")
              .select("*")
              .eq("message_id", messageId)
              .maybeSingle();

            if (handledErr) {
              console.error("❌ Supabase error (messages_handled):", handledErr.message);
              continue;
            }
            if (handled) continue;

            // ✅ Lookup integration + subscription
            const { data: integration, error: intErr } = await supabase
              .from("user_integrations")
              .select("*, user_subscriptions(expires_at)")
              .eq("meta_phone_number_id", phoneNumberId)
              .maybeSingle();

            if (intErr) {
              console.error("❌ Supabase error (integration lookup):", intErr.message);
              continue;
            }
            if (!integration) {
              console.warn(`⚠️ No integration found for phone_number_id: ${phoneNumberId}`);
              continue;
            }

            // ✅ Subscription check
            const expires = integration.user_subscriptions?.expires_at;
            if (!expires || new Date(expires) < new Date()) {
              console.warn(`⚠️ Subscription expired for user ${integration.user_id}`);
              continue;
            }

            // ✅ Prepare reply
            const replyText =
              integration.auto_reply_message ||
              "Thanks for contacting us! We will get back to you soon.";

            // ✅ Send reply via WhatsApp Graph API
            await axios.post(
              `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
              {
                messaging_product: "whatsapp",
                to: fromNumber,
                text: { body: replyText },
              },
              {
                headers: {
                  Authorization: `Bearer ${integration.meta_access_token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log(`✅ Auto-replied to ${fromNumber}`);

            // ✅ Mark message as handled
            await supabase
              .from("messages_handled")
              .insert({ message_id: messageId });
          } catch (err) {
            console.error("❌ Failed processing message:", err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error("❌ Error in handleMetaWebhook:", err.message);
    // No res.sendStatus here since we already responded
  }
};
