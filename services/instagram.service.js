import axios from "axios";

/*
========================================
SEND INSTAGRAM MESSAGE
========================================
*/
export const sendInstagramMessage =
  async ({
    accessToken,
    recipientId,
    message,
  }) => {

    try {

      await axios.post(
        "https://graph.facebook.com/v19.0/me/messages",
        {
          recipient: {
            id: recipientId,
          },

          message: {
            text: message,
          },
        },
        {
          params: {
            access_token:
              accessToken,
          },
        }
      );

      return {
        success: true,
      };

    } catch (err) {

      console.error(
        "INSTAGRAM SEND ERROR:",
        err.response?.data ||
        err.message
      );

      return {
        success: false,
      };
    }
  };