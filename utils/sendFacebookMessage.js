import axios from "axios";

export async function sendFacebookMessage(pageId, token, recipientId, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${pageId}/messages`,
      {
        recipient: { id: recipientId },
        message: { text },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`✅ Sent Facebook message to ${recipientId}`);
  } catch (err) {
    console.error("❌ Error sending Facebook message:", err.response?.data || err.message);
  }
}
