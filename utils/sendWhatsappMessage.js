import axios from "axios";

export async function sendWhatsappMessage(numberId, token, to, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${numberId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`✅ Sent WhatsApp message to ${to}`);
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error.response?.data || error.message);
  }
}
