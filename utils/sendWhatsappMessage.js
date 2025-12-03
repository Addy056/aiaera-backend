import axios from "axios";
import { metaConfig } from "./metaConfig.js";

/**
 * Send a WhatsApp message using WhatsApp Cloud API (User-owned token)
 *
 * @param {string} numberId - WhatsApp Business Phone Number ID.
 * @param {string} accessToken - User-provided access token.
 * @param {string} to - Customer phone number (with country code).
 * @param {string} text - Message text.
 * @returns {object} { success: boolean, messageId?: string, error?: any }
 */
export async function sendWhatsappMessage(
  numberId,
  accessToken,
  to,
  text
) {
  // ✅ Validation
  if (!numberId || !accessToken || !to || !text) {
    console.error("❌ Missing required parameters in sendWhatsappMessage:", {
      numberId,
      hasToken: !!accessToken,
      to,
      textLength: text?.length,
    });

    return {
      success: false,
      error: "Missing required parameters",
    };
  }

  try {
    const url = `${metaConfig.apiBaseUrl}/${numberId}/messages`;

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
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, payload, {
      headers,
      timeout: 15000, // ✅ 15 seconds production-safe timeout
    });

    // ✅ Support all Meta response formats safely
    const messageId =
      response.data?.messages?.[0]?.id ||
      response.data?.message_id ||
      null;

    console.log(`✅ WhatsApp message sent to ${to}`, { messageId });

    if (messageId) {
      return {
        success: true,
        messageId,
      };
    }

    console.warn("⚠️ WhatsApp API returned unexpected response:", response.data);

    return {
      success: false,
      error: "Unexpected WhatsApp API response",
    };
  } catch (error) {
    const errorData = error.response?.data || error.message;

    console.error("❌ Error sending WhatsApp message:", errorData);

    // ✅ Common Meta API errors
    if (errorData?.error?.code === 190) {
      console.error("🔐 WhatsApp token expired or invalid.");
    }

    if (errorData?.error?.code === 131) {
      console.error("⏳ WhatsApp API rate limit hit.");
    }

    return {
      success: false,
      error: errorData,
    };
  }
}
