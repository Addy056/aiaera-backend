// backend/utils/metaConfig.js
import "dotenv/config";

const {
  META_API_VERSION,
  META_ACCESS_TOKEN,
  META_APP_ID,
  META_APP_SECRET,
  META_VERIFY_TOKEN,
} = process.env;

// Default API version fallback if not set
const apiVersion = META_API_VERSION || "v17.0";

// Fail early if critical tokens are missing
if (!META_ACCESS_TOKEN) {
  console.warn("[Meta Config] WARNING: META_ACCESS_TOKEN is not set. WhatsApp API calls will fail.");
}
if (!META_APP_ID || !META_APP_SECRET) {
  console.warn("[Meta Config] WARNING: META_APP_ID or META_APP_SECRET is missing.");
}
if (!META_VERIFY_TOKEN) {
  console.warn("[Meta Config] WARNING: META_VERIFY_TOKEN is missing. Webhook verification may fail.");
}

export const metaConfig = {
  apiBaseUrl: `https://graph.facebook.com/${apiVersion}`,
  accessToken: META_ACCESS_TOKEN,
  appId: META_APP_ID,
  appSecret: META_APP_SECRET,
  verifyToken: META_VERIFY_TOKEN,
};
