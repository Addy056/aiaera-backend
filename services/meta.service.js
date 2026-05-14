import axios from "axios";

/*
========================================
META API VERSION
========================================
*/
const META_API_VERSION =
  "v19.0";

/*
========================================
BASE META REQUEST
========================================
*/
const metaRequest =
  async ({
    url,
    accessToken,
    data,
    method = "POST",
  }) => {

    try {

      const response =
        await axios({
          method,

          url,

          data,

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",
          },
        });

      return {
        success: true,

        data:
          response.data,
      };

    } catch (err) {

      console.error(
        "META API ERROR:",
        err.response?.data ||
        err.message
      );

      return {
        success: false,

        error:
          err.response?.data ||
          err.message,
      };
    }
  };

/*
========================================
SEND WHATSAPP MESSAGE
========================================
*/
export const sendWhatsAppMessage =
  async ({
    phoneNumberId,
    accessToken,
    to,
    message,
  }) => {

    return await metaRequest({

      url:
        `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`,

      accessToken,

      data: {

        messaging_product:
          "whatsapp",

        to,

        text: {
          body:
            message,
        },
      },
    });
  };

/*
========================================
SEND FACEBOOK MESSAGE
========================================
*/
export const sendFacebookMessage =
  async ({
    accessToken,
    recipientId,
    message,
  }) => {

    return await metaRequest({

      url:
        `https://graph.facebook.com/${META_API_VERSION}/me/messages`,

      accessToken,

      data: {

        recipient: {
          id:
            recipientId,
        },

        message: {
          text:
            message,
        },
      },
    });
  };

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

    return await metaRequest({

      url:
        `https://graph.facebook.com/${META_API_VERSION}/me/messages`,

      accessToken,

      data: {

        recipient: {
          id:
            recipientId,
        },

        message: {
          text:
            message,
        },
      },
    });
  };

/*
========================================
VERIFY META TOKEN
========================================
*/
export const verifyMetaWebhook =
  ({
    mode,
    token,
    challenge,
    verifyToken,
  }) => {

    if (
      mode === "subscribe" &&
      token === verifyToken
    ) {

      return challenge;
    }

    return null;
  };

/*
========================================
TEST META CONNECTION
========================================
*/
export const testMetaConnection =
  async ({
    accessToken,
  }) => {

    try {

      const response =
        await axios.get(
          `https://graph.facebook.com/${META_API_VERSION}/me`,
          {
            params: {
              access_token:
                accessToken,
            },
          }
        );

      return {
        success: true,

        data:
          response.data,
      };

    } catch (err) {

      console.error(
        "META CONNECTION TEST ERROR:",
        err.response?.data ||
        err.message
      );

      return {
        success: false,

        error:
          err.response?.data ||
          err.message,
      };
    }
  };