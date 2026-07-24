import axios from "axios";

/*
========================================
FACEBOOK GRAPH API
========================================
*/

const FACEBOOK_API =
  "https://graph.facebook.com/v19.0/me/messages";

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

      if (!pageToken) {
        throw new Error(
          "Facebook Page Access Token is missing."
        );
      }

      if (!recipientId) {
        throw new Error(
          "Facebook Recipient ID is missing."
        );
      }

      const text =
        String(message || "").trim();

      if (!text) {
        throw new Error(
          "Message cannot be empty."
        );
      }

      const response =
        await axios.post(
          FACEBOOK_API,
          {
            recipient: {
              id: recipientId,
            },

            message: {
              text,
            },
          },
          {
            params: {
              access_token:
                pageToken,
            },

            timeout: 15000,
          }
        );

      return {
        success: true,
        data: response.data,
      };

    } catch (err) {

      const error =
        err.response?.data ||
        err.message;

      console.error(
        "FACEBOOK SEND ERROR:",
        error
      );

      return {
        success: false,
        error,
      };
    }
  };