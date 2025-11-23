// utils/sendWhatsappMessage.js
import axios from "axios";

/**
 * Send a WhatsApp message using WhatsApp Cloud API (Meta Graph API v21).
 *
 * @param {string} numberId - WhatsApp Business Phone Number ID.
 * @param {string} token - Permanent or user-provided access token.
 * @param {string} to - Customer phone number (with country code).
 * @param {string} text - Message text.
 */
export async function sendWhatsappMessage(numberId, token, to, text) {
  if (!numberId || !token || !to || !text) {
    console.error("❌ Missing required parameters in sendWhatsappMessage");
    return;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${numberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: text,
      },
    };

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, payload, { headers });

    console.log(`✅ WhatsApp message sent to ${to}`, response.data);

    return response.data;
  } catch (error) {
    const errorData = error.response?.data || error.message;

    console.error("❌ Error sending WhatsApp message:", errorData);

    return {
      error: true,
      details: errorData,
    };
  }
}
