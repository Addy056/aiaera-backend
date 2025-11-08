import axios from "axios";
import supabase from "../config/supabaseClient.js";

/* ------------------------------------------------------
 * 1) META WEBHOOK VERIFICATION
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
    return res.sendStatus(403);
  } catch (err) {
    console.error("❌ Meta webhook verification error:", err.message);
    return res.sendStatus(500);
  }
};

/* ------------------------------------------------------
 * 2) HANDLE META (WA/FB/IG) MESSAGES
 * ------------------------------------------------------ */
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

    // 🔍 Lookup by WhatsApp number id
    const { data: integration, error: fetchError } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("whatsapp_number", phoneNumberId)
      .maybeSingle();

    if (fetchError || !integration) return res.sendStatus(200);

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

    console.log(`✅ Auto-replied to ${from}`);
    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ handleMetaWebhook error:", err);
    return next(err);
  }
};

/* ------------------------------------------------------
 * 3) CALENDLY WEBHOOK (NEW APPOINTMENTS)
 * ------------------------------------------------------ */
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
        console.log(`✅ Appointment saved for ${name}`);
      }
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ handleCalendlyWebhook error:", err);
    return next(err);
  }
};

/* ------------------------------------------------------
 * 4) SAVE INTEGRATIONS (UPSERT)
 * ------------------------------------------------------ */
export const saveIntegrations = async (req, res) => {
  try {
    let { user_id, ...integrationData } = req.body;
    if (!user_id) return res.status(400).json({ success: false, error: "Missing user_id" });
    user_id = String(user_id).replace(/[<>]/g, "").trim();

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
      if (integrationData[key] !== undefined && integrationData[key] !== null && integrationData[key] !== "") {
        filtered[key] = integrationData[key];
      }
    }

    if (filtered.calendly_link) {
      filtered.calendly_link = String(filtered.calendly_link).replace(/<[^>]*>/g, "").trim();
      if (!/^https?:\/\//i.test(filtered.calendly_link)) {
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
      console.error("❌ Supabase upsert error:", error);
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
    console.error("❌ Unexpected error saving integration:", err);
    return res.status(500).json({
      success: false,
      error: "Unexpected error saving integration",
      details: err.message,
    });
  }
};

/* ------------------------------------------------------
 * 5) GET INTEGRATIONS (SAFE / PARTIAL)
 * ------------------------------------------------------ */
export const getIntegrations = async (req, res) => {
  try {
    let { user_id } = req.query;
    user_id = String(user_id || "").replace(/[<>]/g, "").trim();
    if (!user_id) return res.status(400).json({ success: false, error: "Missing user_id" });

    const { data, error } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase fetch error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch integrations",
        details: error.message || error,
      });
    }

    // ✅ Return only available fields (ignore nulls)
    const safeData = {};
    if (data) {
      const keys = [
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
      for (const key of keys) {
        if (data[key] !== null && data[key] !== undefined && data[key] !== "") {
          safeData[key] = data[key];
        }
      }
    }

    return res.json({
      success: true,
      data: safeData,
      message: Object.keys(safeData).length
        ? "Integrations fetched successfully"
        : "No integrations found for this user",
    });
  } catch (err) {
    console.error("❌ getIntegrations unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: "Unexpected error fetching integrations",
      details: err.message,
    });
  }
};
