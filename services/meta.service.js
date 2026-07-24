import axios from "axios";

/*
========================================
META CONFIG
========================================
*/

const META_API_VERSION =
  process.env.META_GRAPH_API_VERSION ||
  "v25.0";

const GRAPH_BASE_URL =
  `https://graph.facebook.com/${META_API_VERSION}`;

/*
========================================
BASE META REQUEST
========================================
*/

const metaRequest = async ({
  url,
  accessToken,
  data,
  method = "POST",
}) => {
  try {

    if (!accessToken) {
      throw new Error(
        "Meta access token is missing."
      );
    }

    const response =
      await axios({
        method,
        url,
        data,
        timeout: 15000,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

    return {
      success: true,
      data: response.data,
    };

  } catch (err) {

    const error =
      err.response?.data ||
      err.message;

    console.error(
      "META API ERROR:",
      error
    );

    return {
      success: false,
      error,
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

    const text =
      String(message || "").trim();

    if (!phoneNumberId) {
      return {
        success: false,
        error:
          "WhatsApp Phone Number ID is missing.",
      };
    }

    if (!to) {
      return {
        success: false,
        error:
          "Recipient phone number is missing.",
      };
    }

    if (!text) {
      return {
        success: false,
        error:
          "Message cannot be empty.",
      };
    }

    return metaRequest({
      url:
        `${GRAPH_BASE_URL}/${phoneNumberId}/messages`,
      accessToken,
      data: {
        messaging_product: "whatsapp",
        to,
        text: {
          body: text,
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

    const text =
      String(message || "").trim();

    if (!recipientId) {
      return {
        success: false,
        error:
          "Facebook recipient ID is missing.",
      };
    }

    if (!text) {
      return {
        success: false,
        error:
          "Message cannot be empty.",
      };
    }

    return metaRequest({
      url:
        `${GRAPH_BASE_URL}/me/messages`,
      accessToken,
      data: {
        recipient: {
          id: recipientId,
        },
        message: {
          text,
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

    const text =
      String(message || "").trim();

    if (!recipientId) {
      return {
        success: false,
        error:
          "Instagram recipient ID is missing.",
      };
    }

    if (!text) {
      return {
        success: false,
        error:
          "Message cannot be empty.",
      };
    }

    return metaRequest({
      url:
        `${GRAPH_BASE_URL}/me/messages`,
      accessToken,
      data: {
        recipient: {
          id: recipientId,
        },
        message: {
          text,
        },
      },
    });
  };

/*
========================================
VERIFY META WEBHOOK
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

    if (!accessToken) {
      return {
        success: false,
        error:
          "Meta access token is missing.",
      };
    }

    try {

      const response =
        await axios.get(
          `${GRAPH_BASE_URL}/me`,
          {
            params: {
              access_token:
                accessToken,
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
        "META CONNECTION TEST ERROR:",
        error
      );

      return {
        success: false,
        error,
      };
    }
  };