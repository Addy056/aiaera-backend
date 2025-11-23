// utils/sendInstagramMessage.js
import axios from "axios";

/**
 * Send a message using Instagram Messaging API (Meta Graph API v21).
 *
 * @param {string} instagramUserId - Instagram Business Account ID (not @username).
 * @param {string} token - Instagram Graph API token.
 * @param {string} recipientId - IG user ID who messaged the business.
 * @param {string} text - Message content.
 */
export async function sendInstagramMessage(instagramUserId, token, recipientId, text) {
  if (!instagramUserId || !token || !recipientId || !text) {
    console.error("❌ Missing required parameters in sendInstagramMessage");
    return;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${instagramUserId}/messages`;

    const payload = {
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE", // Required for replies
    };

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, payload, { headers });

    console.log(`✅ Instagram message sent to ${recipientId}`, response.data);

    return response.data;
  } catch (err) {
    const errorData = err.response?.data || err.message;

    console.error("❌ Error sending Instagram message:", errorData);

    return {
      error: true,
      details: errorData,
    };
  }
}
