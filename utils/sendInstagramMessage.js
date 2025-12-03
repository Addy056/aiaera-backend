import axios from "axios";
import { metaConfig } from "./metaConfig.js";

/**
 * Send a message using Instagram Messaging API (Meta Graph API).
 *
 * @param {string} instagramUserId - Instagram Business Account ID.
 * @param {string} accessToken - User's Instagram Graph API token.
 * @param {string} recipientId - IG user ID who messaged the business.
 * @param {string} text - Message content.
 * @returns {object} { success: boolean, messageId?: string, error?: any }
 */
export async function sendInstagramMessage(
  instagramUserId,
  accessToken,
  recipientId,
  text
) {
  // ✅ Validation
  if (!instagramUserId || !accessToken || !recipientId || !text) {
    console.error("❌ Missing required parameters in sendInstagramMessage:", {
      instagramUserId,
      hasToken: !!accessToken,
      recipientId,
      textLength: text?.length,
    });

    return {
      success: false,
      error: "Missing required parameters",
    };
  }

  try {
    const url = `${metaConfig.apiBaseUrl}/${instagramUserId}/messages`;

    const payload = {
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, payload, {
      headers,
      timeout: 15000, // ✅ 15 seconds timeout protection
    });

    // ✅ Support both possible Meta response formats
    const messageId =
      response.data?.message_id ||
      response.data?.messages?.[0]?.id ||
      null;

    console.log(`✅ Instagram message sent to: ${recipientId}`, {
      messageId,
    });

    return {
      success: true,
      messageId,
      raw: response.data,
    };
  } catch (err) {
    const errorData = err.response?.data || err.message;

    console.error("❌ Error sending Instagram message:", errorData);

    // ✅ Common Meta API errors
    if (errorData?.error?.code === 190) {
      console.error("🔐 Instagram token expired or invalid.");
    }

    if (errorData?.error?.code === 613) {
      console.error("⏳ Instagram API rate limit reached.");
    }

    return {
      success: false,
      error: errorData,
    };
  }
}
