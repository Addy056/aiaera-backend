// backend/controllers/paymentController.js
import crypto from "crypto";
import razorpay from "../config/razorpayConfig.js";
import supabase from "../config/supabaseClient.js";

// 🟣 Define subscription plans
const PLANS = {
  free: { amount: 0, duration: 0 },     // 24h trial
  basic: { amount: 999, duration: 1 },  // 1 month
  pro: { amount: 1999, duration: 1 },   // 1 month
};

/**
 * Create Razorpay order or activate free plan
 */
export const createOrder = async (req, res) => {
  try {
    const { plan, user_id } = req.body;

    // ✅ Validate inputs
    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ success: false, error: "Invalid plan selected" });
    }
    if (!user_id) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    const { amount } = PLANS[plan];

    // 🔹 Free plan (24h trial)
    if (amount === 0) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const { error } = await supabase
        .from("user_subscriptions")
        .upsert(
          [
            {
              user_id,
              plan: "free",
              expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("❌ Supabase error (free trial):", error);
        return res.status(500).json({ success: false, error: "Failed to activate free trial" });
      }

      console.log(`🎉 Free trial activated for user ${user_id}`);
      return res.json({ success: true, message: "Free plan activated", expiresAt });
    }

    // 🔹 Paid plan → Create Razorpay order
    if (!razorpay) {
      console.error("❌ Razorpay client not configured");
      return res.status(500).json({ success: false, error: "Payment gateway not configured" });
    }

    // ✅ Ensure receipt ID is always <= 40 chars
    const shortUserId = user_id.toString().slice(0, 8); // keep it short
    const uniquePart = Date.now().toString().slice(-8); // last 8 digits of timestamp
    const receiptId = `rcpt_${shortUserId}_${uniquePart}`; // always < 40 chars

    const options = {
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: receiptId,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    if (!order || !order.id) {
      console.error("❌ Razorpay order creation failed:", order);
      return res.status(500).json({ success: false, error: "Failed to create Razorpay order" });
    }

    console.log(`✅ Razorpay order created: ${order.id} for user ${user_id}`);
    res.json({ success: true, order });
  } catch (err) {
    console.error("❌ Error in createOrder:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to create order" });
  }
};

/**
 * Verify Razorpay Payment and save subscription
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, user_id } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan || !user_id) {
      return res.status(400).json({ success: false, error: "Missing payment details" });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("❌ RAZORPAY_KEY_SECRET is not configured");
      return res.status(500).json({ success: false, error: "Payment verification misconfigured" });
    }

    // 🔹 Verify Razorpay signature
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      console.warn(`⚠️ Invalid Razorpay signature for user ${user_id}`);
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }

    // 🔹 Calculate subscription expiry
    const durationMonths = PLANS[plan]?.duration || 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    // 🔹 Save subscription in Supabase
    const { error } = await supabase
      .from("user_subscriptions")
      .upsert(
        [
          {
            user_id,
            plan,
            expires_at: expiresAt.toISOString(),
            razorpay_order_id,
            razorpay_payment_id,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("❌ Supabase error (verifyPayment):", error);
      return res.status(500).json({ success: false, error: "Failed to update subscription" });
    }

    console.log(`✅ Payment verified & subscription updated for user ${user_id} (Plan: ${plan})`);
    res.json({
      success: true,
      message: "Payment verified & subscription active",
      plan,
      expiresAt,
    });
  } catch (err) {
    console.error("❌ Error in verifyPayment:", err);
    res.status(500).json({ success: false, error: err?.message || "Payment verification failed" });
  }
};
