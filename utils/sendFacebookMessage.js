import axios from "axios";
import { metaConfig } from "./metaConfig.js";

/**
 * Send a message using Facebook Page Inbox (Meta Graph API).
 *
 * @param {string} pageId - Facebook Page ID.
 * @param {string} pageToken - Page Access Token (stored per user).
 * @param {string} recipientId - PSID of the user.
 * @param {string} text - Message text.
 * @returns {object} { success: boolean, messageId?: string, error?: any }
 */
export async function sendFacebookMessage(
  pageId,
  pageToken,
  recipientId,
  text
) {
  // ✅ Validation
  if (!pageId || !pageToken || !recipientId || !text) {
    console.error("❌ Missing required parameters in sendFacebookMessage:", {
      pageId,
      hasToken: !!pageToken,
      recipientId,
      textLength: text?.length,
    });

    return {
      success: false,
      error: "Missing required parameters",
    };
  }

  try {
    const url = `${metaConfig.apiBaseUrl}/${pageId}/messages`;

    const payload = {
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
    };

    const headers = {
      Authorization: `Bearer ${pageToken}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, payload, {
      headers,
      timeout: 15000, // ✅ 15s production safety timeout
    });

    // ✅ Support both possible Meta response formats
    const messageId =
      response.data?.message_id ||
      response.data?.messages?.[0]?.id ||
      null;

    console.log(`✅ Facebook message sent to PSID: ${recipientId}`, {
      messageId,
    });

    return {
      success: true,
      messageId,
      raw: response.data,
    };
  } catch (err) {
    const errorData = err.response?.data || err.message;

    console.error("❌ Error sending Facebook message:", errorData);

    // ✅ Meta common errors
    if (errorData?.error?.code === 190) {
      console.error("🔐 Facebook Page token expired or invalid.");
    }

    if (errorData?.error?.code === 613) {
      console.error("⏳ Facebook API rate limit reached.");
    }

    return {
      success: false,
      error: errorData,
    };
  }
}
