// backend/utils/metaConfig.js
import "dotenv/config";

const {
  META_API_VERSION,
  META_APP_ID,
  META_APP_SECRET,
  META_VERIFY_TOKEN,
} = process.env;

// Default API version if not set
const apiVersion = META_API_VERSION || "v21.0";

if (!META_VERIFY_TOKEN) {
  console.warn("⚠️ META_VERIFY_TOKEN is not set in .env");
}

export const metaConfig = {
  apiBaseUrl: `https://graph.facebook.com/${apiVersion}`,
  appId: META_APP_ID || "",
  appSecret: META_APP_SECRET || "",
  verifyToken: META_VERIFY_TOKEN || "",
};
