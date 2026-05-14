import axios from "axios";

/*
========================================
SEND FACEBOOK MESSAGE
========================================
*/
export const sendFacebookMessage =
  async ({
    pageToken,
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
              pageToken,
          },
        }
      );

      return {
        success: true,
      };

    } catch (err) {

      console.error(
        "FACEBOOK SEND ERROR:",
        err.response?.data ||
        err.message
      );

      return {
        success: false,
      };
    }
  };