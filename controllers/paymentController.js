// backend/controllers/paymentController.js
import crypto from "crypto";
import razorpay from "../config/razorpayConfig.js";
import supabase from "../config/supabaseClient.js";

// 🟣 Subscription Plans
const PLANS = {
  free: { amount: 0, duration: 0 },     // 24h trial
  basic: { amount: 999, duration: 1 },  // 1 month
  pro: { amount: 1999, duration: 1 },   // 1 month
};

/**
 * ----------------------------------------------------------
 * Create Razorpay Order or Activate Free Trial
 * ----------------------------------------------------------
 */
export const createOrder = async (req, res) => {
  try {
    const { plan, user_id } = req.body;
    console.log(`🟢 [CreateOrder] Incoming request → Plan: ${plan}, User: ${user_id}`);

    // ✅ Validate inputs
    if (!plan || !PLANS[plan]) {
      console.warn("⚠️ Invalid or missing plan:", plan);
      return res.status(400).json({ success: false, error: "Invalid plan selected" });
    }
    if (!user_id) {
      console.warn("⚠️ Missing user_id in request body");
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    const { amount } = PLANS[plan];

    // 🔹 Free Trial Activation
    if (amount === 0) {
      console.log("🆓 Activating free trial for user:", user_id);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const { error } = await supabase
        .from("user_subscriptions")
        .upsert(
          [{
            user_id,
            plan: "free",
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          }],
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("❌ Supabase error (free trial):", error);
        return res.status(500).json({ success: false, error: "Failed to activate free trial" });
      }

      console.log(`🎉 Free trial activated successfully for user ${user_id} until ${expiresAt}`);
      return res.json({ success: true, message: "Free plan activated", expiresAt });
    }

    // 🔹 Paid Plan → Razorpay order
    if (!razorpay) {
      console.error("❌ Razorpay client not configured");
      return res.status(500).json({ success: false, error: "Payment gateway not configured" });
    }

    const shortUserId = user_id.toString().slice(0, 8);
    const uniquePart = Date.now().toString().slice(-8);
    const receiptId = `rcpt_${shortUserId}_${uniquePart}`; // <40 chars

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: receiptId,
      payment_capture: 1,
    };

    console.log("🪙 [Razorpay] Creating order →", options);

    const order = await razorpay.orders.create(options);

    if (!order || !order.id) {
      console.error("❌ Razorpay order creation failed:", order);
      return res.status(500).json({ success: false, error: "Failed to create Razorpay order" });
    }

    console.log(`✅ [Razorpay] Order created successfully: ${order.id} for user ${user_id}`);
    res.json({ success: true, order });
  } catch (err) {
    console.error("❌ [createOrder] Error:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to create order" });
  }
};

/**
 * ----------------------------------------------------------
 * Verify Razorpay Payment & Update Subscription
 * ----------------------------------------------------------
 */
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      user_id,
    } = req.body;

    console.log("🟢 [VerifyPayment] Verifying payment for user:", user_id);

    // ✅ Validate all inputs
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan || !user_id) {
      console.warn("⚠️ Missing required payment details in verifyPayment");
      return res.status(400).json({ success: false, error: "Missing payment details" });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("❌ RAZORPAY_KEY_SECRET not configured");
      return res.status(500).json({ success: false, error: "Payment verification misconfigured" });
    }

    // 🔹 Verify Signature
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      console.warn(`⚠️ Invalid Razorpay signature for user ${user_id}`);
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }

    console.log(`✅ [Razorpay] Signature verified for order ${razorpay_order_id}`);

    // 🔹 Calculate Expiry
    const durationMonths = PLANS[plan]?.duration || 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    console.log(`📆 Subscription valid until: ${expiresAt.toISOString()}`);

    // 🔹 Update Supabase
    const { error } = await supabase
      .from("user_subscriptions")
      .upsert(
        [{
          user_id,
          plan,
          expires_at: expiresAt.toISOString(),
          razorpay_order_id,
          razorpay_payment_id,
          updated_at: new Date().toISOString(),
        }],
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("❌ Supabase update error (verifyPayment):", error);
      return res.status(500).json({ success: false, error: "Failed to update subscription" });
    }

    console.log(`🎯 Payment verified & subscription updated for user ${user_id} (Plan: ${plan})`);
    res.json({
      success: true,
      message: "Payment verified & subscription active",
      plan,
      expiresAt,
    });
  } catch (err) {
    console.error("❌ [verifyPayment] Exception:", err);
    res.status(500).json({
      success: false,
      error: err?.message || "Payment verification failed",
    });
  }
};
