import axios from "axios";

/*
========================================
GRAPH API CONFIG
========================================
*/

const GRAPH_API_VERSION =
  process.env.META_GRAPH_API_VERSION ||
  "v25.0";

const GRAPH_API_URL =
  `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages`;

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

    /*
    ========================================
    VALIDATION
    ========================================
    */

    if (!accessToken) {
      return {
        success: false,
        error: "Missing Instagram access token.",
      };
    }

    if (!recipientId) {
      return {
        success: false,
        error: "Missing Instagram recipient ID.",
      };
    }

    if (!text) {
      return {
        success: false,
        error: "Message cannot be empty.",
      };
    }

    try {

      console.log("========================================");
      console.log("📤 SENDING INSTAGRAM MESSAGE");
      console.log("Recipient:", recipientId);
      console.log("Graph API:", GRAPH_API_VERSION);
      console.log("Token Length:", accessToken.length);
      console.log(
        "Token Preview:",
        `${accessToken.substring(0, 10)}...`
      );
      console.log("Message:", text);
      console.log("========================================");

      const response =
        await axios.post(
          GRAPH_API_URL,
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
              access_token: accessToken,
            },
            timeout: 15000,
          }
        );

      console.log("========================================");
      console.log("✅ INSTAGRAM MESSAGE SENT");
      console.log(response.data);
      console.log("========================================");

      return {
        success: true,
        data: response.data,
      };

    } catch (err) {

      const error =
        err.response?.data ||
        err.message;

      console.error("========================================");
      console.error("❌ INSTAGRAM SEND ERROR");
      console.error(error);
      console.error("========================================");

      return {
        success: false,
        error,
      };
    }
  };