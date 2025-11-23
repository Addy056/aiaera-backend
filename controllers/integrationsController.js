// backend/controllers/metaController.js
import axios from "axios";
import supabase from "../config/supabaseClient.js";

/* ------------------------------------------------------
 * 1) META WEBHOOK VERIFICATION  (WhatsApp, IG, FB)
 * ------------------------------------------------------ */
export const verifyMetaWebhook = (req, res) => {
  try {
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
  } catch (err) {
    console.error("❌ Meta verify error:", err);
    return res.sendStatus(500);
  }
};

/* ------------------------------------------------------
 * 2) WHATSAPP + FACEBOOK + INSTAGRAM (Multi-Channel Handler)
 * ------------------------------------------------------ */
export const handleMetaWebhook = async (req, res, next) => {
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    /* ----------------------------------------
       2A) Detect Messaging Product
    ---------------------------------------- */
    const product = value?.messaging_product;

    if (!product) {
      return res.sendStatus(200);
    }

    /* --------------------------------------------------
       2B) WHATSAPP FORMAT
       (value.messages[0].from / text.body)
    -------------------------------------------------- */
    if (product === "whatsapp") {
      const msg = value?.messages?.[0];
      if (!msg) return res.sendStatus(200);

      const from = msg.from;
      const text = msg.text?.body || "";
      const messageId = msg.id;
      const phoneId = value.metadata?.phone_number_id;

      if (!phoneId || !from) return res.sendStatus(200);

      /** Avoid duplicates */
      const { data: exists } = await supabase
        .from("messages_handled")
        .select("message_id")
        .eq("message_id", messageId)
        .maybeSingle();

      if (exists) return res.sendStatus(200);

      /** Find owner by phone_number_id */
      const { data: integration } = await supabase
        .from("user_integrations")
        .select("*")
        .eq("whatsapp_number", phoneId)
        .maybeSingle();

      if (!integration) return res.sendStatus(200);

      const reply = await generateWhatsAppReply(text, integration);

      await axios.post(
        `https://graph.facebook.com/v17.0/${phoneId}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          text: { body: reply },
        },
        {
          headers: {
            Authorization: `Bearer ${integration.whatsapp_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      /** Mark message handled */
      await supabase
        .from("messages_handled")
        .insert([{ message_id: messageId, user_id: integration.user_id }]);

      return res.sendStatus(200);
    }

    /* --------------------------------------------------
       2C) FACEBOOK / INSTAGRAM FORMAT
       (value.messages[0] under "messaging" OR "messages")
    -------------------------------------------------- */

    // IG + FB messenger can come under value.messages OR entry.messaging
    const msg =
      value?.messages?.[0] ||
      entry?.messaging?.[0] ||
      null;

    if (!msg) return res.sendStatus(200);

    const senderId = msg.from || msg.sender?.id || null;
    const text =
      msg?.text?.body ||
      msg?.text ||
      msg?.message?.text ||
      "";

    const messageId = msg.id || msg.mid;

    if (!senderId || !messageId) return res.sendStatus(200);

    /** Avoid duplicates */
    const { data: exists } = await supabase
      .from("messages_handled")
      .select("message_id")
      .eq("message_id", messageId)
      .maybeSingle();

    if (exists) return res.sendStatus(200);

    /* ---- Identify User ---- */
    const pageId = entry.id;

    const { data: user } = await supabase
      .from("user_integrations")
      .select("*")
      .or(
        `fb_page_id.eq.${pageId},instagram_user_id.eq.${pageId}`
      )
      .maybeSingle();

    if (!user) return res.sendStatus(200);

    const aiReply = await generateAIReply(user.user_id, text);

    /* ---- Send FB Message ---- */
    if (product === "facebook") {
      await axios.post(
        `https://graph.facebook.com/v17.0/me/messages?access_token=${user.fb_page_token}`,
        {
          recipient: { id: senderId },
          message: { text: aiReply },
        }
      );
    }

    /* ---- Send IG DM ---- */
    if (product === "instagram") {
      await axios.post(
        `https://graph.facebook.com/v17.0/${user.instagram_user_id}/messages`,
        {
          recipient: senderId,
          message: { text: aiReply },
        },
        {
          headers: {
            Authorization: `Bearer ${user.instagram_access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /* Mark handled */
    await supabase
      .from("messages_handled")
      .insert([{ message_id: messageId, user_id: user.user_id }]);

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ handleMetaWebhook error:", err);
    return next(err);
  }
};

/* ------------------------------------------------------
 * 3) HELPER — SIMPLE CALENDLY AUTO-RESPONSE
 * ------------------------------------------------------ */
async function generateWhatsAppReply(text, integration) {
  const safe = text.toLowerCase();

  // Appointment intent
  const trigger = ["book", "meeting", "schedule", "appointment", "demo"];
  if (trigger.some((k) => safe.includes(k))) {
    if (integration.calendly_link) {
      return `📅 Book a meeting:\n${integration.calendly_link}`;
    }
    return `We don't have a booking link yet. Please contact us directly.`;
  }

  // Business address
  if (integration.business_address) {
    return `📍 Our address:\n${integration.business_address}`;
  }

  return `Thanks for messaging us! How can we help you?`;
}

/* ------------------------------------------------------
 * 4) CALENDLY WEBHOOK (MAPS TO user_integrations)
 * ------------------------------------------------------ */
export const handleCalendlyWebhook = async (req, res) => {
  try {
    const body = req.body;

    if (body?.event !== "invitee.created") {
      return res.sendStatus(200);
    }

    const invitee = body.payload?.invitee;
    const eventUrl = body.payload?.event?.uri;
    let schedulingUrl =
      body.payload?.event?.event_type?.scheduling_url || "";

    schedulingUrl = schedulingUrl.trim();
    if (schedulingUrl && !/^https?:\/\//i.test(schedulingUrl)) {
      schedulingUrl = "https://" + schedulingUrl;
    }

    // Find which user owns this Calendly link
    const { data: owner } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("calendly_link", schedulingUrl)
      .maybeSingle();

    if (!owner) return res.sendStatus(404);

    await supabase
      .from("appointments")
      .insert([
        {
          user_id: owner.user_id,
          customer_name: invitee?.name,
          customer_email: invitee?.email,
          calendly_event_link: schedulingUrl,
        },
      ]);

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Calendly webhook error:", err);
    return res.sendStatus(500);
  }
};

/* ------------------------------------------------------
 * 5) SAVE INTEGRATIONS (CLEAN + SAFE)
 * ------------------------------------------------------ */
export const saveIntegrations = async (req, res) => {
  try {
    let { user_id, ...payload } = req.body;

    if (!user_id)
      return res
        .status(400)
        .json({ success: false, error: "Missing user_id" });

    user_id = String(user_id).trim();

    const allowed = [
      "whatsapp_number",
      "whatsapp_token",
      "fb_page_id",
      "fb_page_token",
      "instagram_user_id",
      "instagram_access_token",
      "calendly_link",
      "business_address",
      "business_lat",
      "business_lng",
    ];

    const filtered = {};
    for (const key of allowed) {
      if (payload[key] !== undefined && payload[key] !== "") {
        filtered[key] = payload[key];
      }
    }

    // Clean Calendly link
    if (filtered.calendly_link) {
      filtered.calendly_link = filtered.calendly_link.trim();
      if (!/^https?:\/\//i.test(filtered.calendly_link)) {
        filtered.calendly_link = "https://" + filtered.calendly_link;
      }
    }

    const { data, error } = await supabase
      .from("user_integrations")
      .upsert([{ user_id, ...filtered }], {
        onConflict: "user_id",
      })
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        error: "Failed to save integration",
        details: error.message,
      });
    }

    return res.json({
      success: true,
      data,
      message: "Integrations saved",
    });
  } catch (err) {
    console.error("❌ saveIntegrations error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ------------------------------------------------------
 * 6) GET INTEGRATIONS
 * ------------------------------------------------------ */
export const getIntegrations = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id)
      return res.status(400).json({ error: "Missing user_id" });

    const { data } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    return res.json({
      success: true,
      data: data || {},
    });
  } catch (err) {
    console.error("❌ getIntegrations error:", err);
    res.status(500).json({ error: err.message });
  }
};
