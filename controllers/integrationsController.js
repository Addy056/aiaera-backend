import axios from "axios";
import supabase from "../config/supabaseClient.js";

/**
 * ------------------------------------------------------
 * 1) META WEBHOOK VERIFICATION
 * ------------------------------------------------------
 */
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
    console.error("Meta webhook verification error:", err.message);
    return res.sendStatus(500);
  }
};

/**
 * ------------------------------------------------------
 * 2) HANDLE META (WA/FB/IG) MESSAGES
 * ------------------------------------------------------
 */
export const handleMetaWebhook = async (req, res, next) => {
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages?.length) return res.sendStatus(200);

    const msg = messages[0];
    const from = msg?.from;
    const text =
      msg?.text?.body ||
      msg?.message?.text ||
      msg?.message ||
      "No message";

    const phoneNumberId = value?.metadata?.phone_number_id;
    if (!phoneNumberId) return res.sendStatus(200);

    // Find integration by WhatsApp number id
    const { data: integration, error: fetchError } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("whatsapp_number", phoneNumberId)
      .maybeSingle();

    if (fetchError || !integration) return res.sendStatus(200);

    // Quick auto-reply
    const safeText = (text || "").toLowerCase();
    const wantsAppointment = ["book", "schedule", "appointment", "meeting", "call", "demo", "consultation"]
      .some((k) => safeText.includes(k));

    let replyText = `Thanks for your message: "${text}"`;
    if (wantsAppointment && integration.calendly_link) {
      let clean = integration.calendly_link.trim();
      if (!/^https?:\/\//i.test(clean)) clean = "https://" + clean;
      replyText = `Hi 👋 Book a time here: ${clean}`;
    } else if (wantsAppointment && !integration.calendly_link) {
      replyText = "We don’t have a booking link set yet. Please check back later or contact us directly!";
    } else if (integration.business_address) {
      replyText = `📍 Our business location: ${integration.business_address}`;
    }

    const token =
      integration.whatsapp_token ||
      integration.fb_page_token ||
      integration.instagram_access_token;

    if (!token) return res.sendStatus(200);

    await axios.post(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: replyText },
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    return res.sendStatus(200);
  } catch (err) {
    console.error("handleMetaWebhook error:", err);
    return next(err);
  }
};

/**
 * ------------------------------------------------------
 * 3) CALENDLY WEBHOOK (NEW APPOINTMENTS)
 * ------------------------------------------------------
 */
export const handleCalendlyWebhook = async (req, res, next) => {
  try {
    const event = req.body;

    if (event?.event === "invitee.created") {
      const invitee = event.payload?.invitee;
      const eventLink = event.payload?.event?.uri;
      const name = invitee?.name || "Guest";
      const email = invitee?.email || null;

      let bookingLink = event.payload?.event?.event_type?.scheduling_url || "";
      if (typeof bookingLink === "string") {
        bookingLink = bookingLink.trim();
        if (bookingLink && !/^https?:\/\//i.test(bookingLink)) {
          bookingLink = "https://" + bookingLink;
        }
      }

      const { data: integration } = await supabase
        .from("user_integrations")
        .select("*")
        .eq("calendly_link", bookingLink)
        .maybeSingle();

      if (integration) {
        await supabase.from("appointments").insert([
          {
            user_id: integration.user_id,
            customer_name: name,
            customer_email: email,
            calendly_event_link: eventLink || bookingLink || null,
          },
        ]);
        console.log(`Appointment saved for ${name}`);
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("handleCalendlyWebhook error:", err);
    return next(err);
  }
};

/**
 * ------------------------------------------------------
 * 4) SAVE INTEGRATIONS (UPSERT)
 * ------------------------------------------------------
 */
export const saveIntegrations = async (req, res) => {
  try {
    const { user_id, ...integrationData } = req.body;

    // Strict UUID validation (v1-5)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!user_id || !uuidRegex.test(user_id)) {
      return res.status(400).json({ success: false, error: "Invalid or missing user_id" });
    }

    // Only allow known columns that exist in DB
    const allowed = [
      "whatsapp_number",
      "whatsapp_token",
      "fb_page_id",
      "fb_page_token",
      "calendly_link",
      "instagram_user_id",
      "instagram_page_id",
      "instagram_access_token",
      "business_address",
      "business_lat",
      "business_lng",
    ];

    const filtered = {};
    for (const key of allowed) {
      if (integrationData[key] !== undefined && integrationData[key] !== null) {
        filtered[key] = integrationData[key];
      }
    }

    // Normalize Calendly link
    if (filtered.calendly_link) {
      filtered.calendly_link = String(filtered.calendly_link).replace(/<[^>]*>/g, "").trim();
      if (filtered.calendly_link && !/^https?:\/\//i.test(filtered.calendly_link)) {
        filtered.calendly_link = "https://" + filtered.calendly_link;
      }
    }

    filtered.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("user_integrations")
      .upsert([{ user_id, ...filtered }], { onConflict: "user_id" })
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase upsert error:", error);
      return res.status(500).json({
        success: false,
        error: "Database error while saving integration",
        details: error.message || error,
      });
    }

    return res.json({
      success: true,
      message: "Integration saved successfully",
      data: data || {},
    });
  } catch (err) {
    console.error("Unexpected error saving integration:", err);
    return res.status(500).json({
      success: false,
      error: "Unexpected error saving integration",
      details: err.message,
    });
  }
};

/**
 * ------------------------------------------------------
 * 5) GET INTEGRATIONS
 * ------------------------------------------------------
 */
export const getIntegrations = async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ success: false, error: "Missing user_id in query params" });
    }

    const { data, error } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) {
      console.error("Supabase fetch error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch integrations",
        details: error.message || error,
      });
    }

    return res.json({ success: true, data: data || {} });
  } catch (err) {
    console.error("getIntegrations unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: "Unexpected error fetching integrations",
      details: err.message,
    });
  }
};
