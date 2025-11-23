import axios from "axios";

/**
 * Send a WhatsApp text message via Meta Cloud API
 *
 * @param {string} accessToken - User's WhatsApp access token
 * @param {string} phoneNumberId - Business phone number ID from Meta
 * @param {string} to - Customer phone number (WhatsApp ID)
 * @param {string} message - Text message body
 * @returns {boolean} - true if sent successfully, false otherwise
 */
export const sendWhatsAppMessage = async (
  accessToken,
  phoneNumberId,
  to,
  message
) => {
  try {
    if (!accessToken || !phoneNumberId || !to || !message) {
      console.error("❌ Missing argument in sendWhatsAppMessage:", {
        accessToken: !!accessToken,
        phoneNumberId,
        to,
        messageLength: message?.length,
      });
      return false;
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: message },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, payload, { headers });

    // WhatsApp returns message_id if successful
    if (response.data?.messages?.[0]?.id) {
      return true;
    }

    console.warn("⚠️ WhatsApp API returned unexpected response:", response.data);
    return false;
  } catch (error) {
    const errData = error.response?.data;

    console.error("❌ WhatsApp API error:", {
      message: error.message,
      meta: errData || null,
    });

    // Special handling for common Meta API errors
    if (errData?.error?.code === 190) {
      console.error("🔐 Token expired or invalid.");
    }
    if (errData?.error?.code === 131) {
      console.error("⏳ WhatsApp API rate limit hit.");
    }

    return false;
  }
};
