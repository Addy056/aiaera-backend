import axios from 'axios';

export const sendWhatsAppMessage = async (accessToken, phoneNumberId, to, message) => {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return true;
  } catch (error) {
    console.error('WhatsApp API error:', error.response?.data || error.message);
    return false;
  }
};
