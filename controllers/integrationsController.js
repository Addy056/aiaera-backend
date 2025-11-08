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

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Meta webhook verified");
      return res.status(200).send(challenge);
    }

    console.warn("⚠️ Meta webhook verification failed");
    return res.sendStatus(403);
  } catch (err) {
    console.error("❌ Meta webhook verification error:", err.message);
    return res.sendStatus(500);
  }
};

/**
 * ------------------------------------------------------
 * 2. HANDLE META MESSAGES (WhatsApp + Messenger + Instagram)
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
      "";

    const phoneNumberId = value?.metadata?.phone_number_id;
    if (!phoneNumberId) {
      console.warn("⚠️ Webhook missing phone_number_id");
      return res.sendStatus(200);
    }

    // Lookup integration by WhatsApp number
    const { data: integration, error: fetchError } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("whatsapp_number", phoneNumberId)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Supabase fetch error:", fetchError);
      return res.sendStatus(500);
    }
    if (!integration) {
      console.warn("⚠️ No integration found for phoneNumberId:", phoneNumberId);
      return res.sendStatus(200);
    }

    // --- Smart Auto-reply Logic ---
    const safeText = (text || "").toLowerCase();
    let replyText;
    const appointmentKeywords = [
      "book",
      "schedule",
      "appointment",
      "meeting",
      "call",
      "demo",
      "consultation",
    ];
    const wantsAppointment = appointmentKeywords.some((k) => safeText.includes(k));

    if (wantsAppointment && integration.calendly_link) {
      let cleanLink = String(integration.calendly_link).trim();
      if (!/^https?:\/\//i.test(cleanLink)) cleanLink = "https://" + cleanLink;
      replyText = `Hi! 👋\nI'd be happy to set that up.\nBook a time here: ${cleanLink}`;
    } else if (wantsAppointment && !integration.calendly_link) {
      replyText =
        "It looks like we don’t have a booking link set up yet. Please check back later or contact us directly!";
    } else if (integration.business_address) {
      replyText = `📍 Our business location: ${integration.business_address}`;
    } else {
      replyText = text
        ? `Thanks for your message: "${text}"`
        : "Thanks for your message!";
    }

    // --- Send Reply via Meta API ---
    const accessToken =
      integration.whatsapp_token ||
      integration.instagram_access_token ||
      integration.fb_page_token;

    if (!accessToken) {
      console.warn("⚠️ No access token found for integration:", integration.user_id);
      return res.sendStatus(200);
    }

    await axios.post(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        messaging_product: integration.whatsapp_token ? "whatsapp" : "instagram",
        to: from,
        text: { body: replyText },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Auto-replied to ${from}`);
    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error in handleMetaWebhook:", err);
    return next(err);
  }
};

/**
 * ------------------------------------------------------
 * 3. HANDLE CALENDLY WEBHOOK (NEW APPOINTMENTS)
 * ------------------------------------------------------
 */
export const handleCalendlyWebhook = async (req, res, next) => {
  try {
    const event = req.body;

    if (event?.event === "invitee.created") {
      const invitee = event.payload?.invitee;
      const eventLink = event.payload?.event?.uri;
      const customerName = invitee?.name || null;
      const customerEmail = invitee?.email || null;

      let bookingLink = event.payload?.event?.event_type?.scheduling_url || "";
      if (typeof bookingLink === "string") {
        bookingLink = bookingLink.trim();
        if (bookingLink && !/^https?:\/\//i.test(bookingLink)) {
          bookingLink = "https://" + bookingLink;
        }
      }

      const { data: integration, error: fetchError } = await supabase
        .from("user_integrations")
        .select("*")
        .eq("calendly_link", bookingLink)
        .maybeSingle();

      if (fetchError) {
        console.error("❌ Supabase fetch error (Calendly):", fetchError);
        return res.sendStatus(500);
      }

      if (integration) {
        const { error: insertError } = await supabase
          .from("appointments")
          .insert([
            {
              user_id: integration.user_id,
              customer_name: customerName,
              customer_email: customerEmail,
              calendly_event_link: eventLink || bookingLink || null,
            },
          ]);

        if (insertError) {
          console.error("❌ Error inserting appointment:", insertError);
        } else {
          console.log(`✅ Appointment saved for ${customerName || "invitee"}`);
        }
      } else {
        console.warn("⚠️ No matching integration for Calendly link:", bookingLink);
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error in handleCalendlyWebhook:", err);
    return next(err);
  }
};

/**
 * ------------------------------------------------------
 * 4. SAVE INTEGRATIONS (UPSERT)
 * ------------------------------------------------------
 */
export const saveIntegrations = async (req, res) => {
  try {
    const { user_id, ...integrationData } = req.body;
    if (!user_id)
      return res.status(400).json({ success: false, error: "Missing user_id" });

    const allowedFields = [
      "whatsapp_number",
      "whatsapp_token",
      "facebook_token",
      "instagram_token",
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

    const filteredData = {};
    for (const key of allowedFields) {
      if (integrationData[key] !== undefined && integrationData[key] !== null)
        filteredData[key] = integrationData[key];
    }

    // Normalize Calendly URL
    if (typeof filteredData.calendly_link === "string") {
      filteredData.calendly_link = filteredData.calendly_link
        .replace(/<[^>]*>/g, "")
        .trim();
      if (
        filteredData.calendly_link &&
        !/^https?:\/\//i.test(filteredData.calendly_link)
      ) {
        filteredData.calendly_link = "https://" + filteredData.calendly_link;
      }
    }

    filteredData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("user_integrations")
      .upsert([{ user_id, ...filteredData }], { onConflict: "user_id" })
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase upsert error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to save integration", details: error });
    }

    return res.json({
      success: true,
      message: "Integration details saved successfully",
      data: data || {},
    });
  } catch (err) {
    console.error("❌ Error saving integrations:", err);
    return res.status(500).json({
      success: false,
      error: "Unexpected error saving integration",
      details: err.message,
    });
  }
};

/**
 * ------------------------------------------------------
 * 5. GET INTEGRATIONS (ENHANCED)
 * ------------------------------------------------------
 */
export const getIntegrations = async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id)
      return res.status(400).json({ success: false, error: "Missing user_id" });

    const { data, error } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase fetch error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to fetch integrations", details: error });
    }

    // ✅ Auto-format data for frontend compatibility
    const integrations = {
      whatsapp_number: data?.whatsapp_number || "",
      fb_page_id: data?.fb_page_id || "",
      instagram_page_id: data?.instagram_page_id || "",
      calendly_link: data?.calendly_link || "",
      business_address: data?.business_address || "",
      business_lat: data?.business_lat || null,
      business_lng: data?.business_lng || null,
    };

    return res.json({ success: true, data: integrations });
  } catch (err) {
    console.error("❌ Error fetching integrations:", err);
    return res.status(500).json({
      success: false,
      error: "Unexpected error fetching integrations",
      details: err.message,
    });
  }
};
