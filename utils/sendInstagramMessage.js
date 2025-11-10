import axios from "axios";

export async function sendInstagramMessage(instagramUserId, token, recipientId, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${instagramUserId}/messages`,
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
    console.log(`✅ Sent Instagram message to ${recipientId}`);
  } catch (err) {
    console.error("❌ Error sending Instagram message:", err.response?.data || err.message);
  }
}
