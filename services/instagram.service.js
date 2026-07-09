import axios from "axios";
/*
========================================
GRAPH API VERSION
========================================
*/
const GRAPH_API_VERSION =
  process.env.META_GRAPH_API_VERSION ||
  "v25.0";
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
/*
========================================
VALIDATION
========================================
*/
if (!accessToken) {

  return {
    success: false,
    error: "Missing access token",
  };

}

if (!recipientId) {

  return {
    success: false,
    error: "Missing recipient id",
  };

}

if (!message?.trim()) {

  return {
    success: false,
    error: "Message is empty",
  };

}
    try {

      
      console.log("========================================");
      console.log("📤 SENDING INSTAGRAM MESSAGE");
      console.log("Recipient:", recipientId);
      console.log("Token Length:", accessToken?.length);
      console.log(
        "Token Starts With:",
        accessToken
          ? `${accessToken.substring(0, 10)}...`
          : "NULL"
      );
      console.log("Message:", message);
      console.log("========================================");

      const response =
        await axios.post(
  `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages`,
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

      console.log("========================================");
      console.log("✅ INSTAGRAM API RESPONSE");
      console.log(response.data);
      console.log("========================================");

      return {
        success: true,
        data: response.data,
      };

    } catch (err) {

      console.error("========================================");
      console.error("❌ INSTAGRAM SEND ERROR");

      if (err.response) {
        console.error("Status:", err.response.status);
        console.error("Response:", err.response.data);
      } else {
        console.error(err.message);
      }

      console.error("========================================");

      return {
        success: false,
        error:
          err.response?.data ||
          err.message,
      };
    }
  };