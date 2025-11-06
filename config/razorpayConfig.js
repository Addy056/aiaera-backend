// backend/utils/razorpayConfig.js
import "dotenv/config";
import Razorpay from "razorpay";

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, NODE_ENV } = process.env;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error("[Razorpay Config] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment variables.");
}

if (NODE_ENV !== "production") {
  console.log("🔑 Razorpay Config Loaded", {
    key_id: RAZORPAY_KEY_ID ? "✅ Loaded" : "❌ Missing",
    key_secret: RAZORPAY_KEY_SECRET ? "✅ Loaded" : "❌ Missing",
  });
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

export default razorpay;
