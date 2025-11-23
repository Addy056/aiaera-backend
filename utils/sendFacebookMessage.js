// utils/sendFacebookMessage.js
import axios from "axios";

/**
 * Send a message using Facebook Page Inbox (Meta Graph API v21).
 *
 * @param {string} pageId - Facebook Page ID.
 * @param {string} token - Page Access Token (not user token).
 * @param {string} recipientId - PSID of the user.
 * @param {string} text - Message text.
 */
export async function sendFacebookMessage(pageId, token, recipientId, text) {
  if (!pageId || !token || !recipientId || !text) {
    console.error("❌ Missing required parameters in sendFacebookMessage");
    return;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${pageId}/messages`;

    const payload = {
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
    };

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, payload, { headers });

    console.log(`✅ Facebook message sent to: ${recipientId}`, response.data);
    return response.data;
  } catch (err) {
    const errorData = err.response?.data || err.message;

    console.error("❌ Error sending Facebook message:", errorData);

    // Return error back to controller
    return {
      error: true,
      details: errorData,
    };
  }
}
