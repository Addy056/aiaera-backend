// backend/controllers/paymentController.js
import crypto from "crypto";
import razorpay from "../config/razorpayConfig.js";
import supabase from "../config/supabaseClient.js";

/* ----------------------------------------------------
 * PLAN DEFINITIONS (must match your frontend)
 * ---------------------------------------------------- */
const PLANS = {
  free:  { amount: 0,    duration: 1 }, // 1 day trial
  basic: { amount: 999,  duration: 1 }, // 1 month
  pro:   { amount: 1999, duration: 1 }, // 1 month
};

/* ----------------------------------------------------
 * CREATE ORDER (OR ACTIVATE FREE TRIAL)
 * ---------------------------------------------------- */
export const createOrder = async (req, res) => {
  try {
    const { plan, user_id } = req.body;
    console.log(`📩 /createOrder → user=${user_id} plan=${plan}`);

    if (!user_id)
      return res.status(400).json({ success: false, error: "Missing user_id" });

    if (!plan || !PLANS[plan])
      return res.status(400).json({ success: false, error: "Invalid plan selected" });

    const { amount } = PLANS[plan];

    /* --------------------------------------------
     * 1️⃣ FREE TRIAL ACTIVATION
     * -------------------------------------------- */
    if (amount === 0) {
      console.log("🆓 Activating free plan…");

      const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day

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
        console.error("❌ Free plan activation error:", error);
        return res.status(500).json({ success: false, error: "Failed to activate free trial" });
      }

      console.log(`🎉 Free trial active until ${expiresAt}`);
      return res.json({
        success: true,
        free: true,
        expiresAt,
      });
    }

    /* --------------------------------------------
     * 2️⃣ PAID PLAN → CREATE RAZORPAY ORDER
     * -------------------------------------------- */
    if (!razorpay) {
      console.error("❌ Razorpay client not initialised (check env)");
      return res.status(500).json({ success: false, error: "Payment gateway not configured" });
    }

    const receiptId = `rcpt_${user_id.slice(0, 8)}_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: receiptId,
      payment_capture: 1,
    });

    if (!order?.id) {
      console.error("❌ Failed to create Razorpay order:", order);
      return res.status(500).json({ success: false, error: "Failed to create order" });
    }

    console.log(`🪙 Razorpay Order Created: ${order.id}`);

    return res.json({ success: true, order });

  } catch (err) {
    console.error("❌ createOrder error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Could not create order",
    });
  }
};

/* ----------------------------------------------------
 * VERIFY PAYMENT SIGNATURE → UPDATE SUBSCRIPTION
 * ---------------------------------------------------- */
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      user_id,
    } = req.body;

    console.log(`🔐 /verifyPayment → user=${user_id} plan=${plan}`);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ success: false, error: "Missing Razorpay fields" });

    if (!plan || !PLANS[plan])
      return res.status(400).json({ success: false, error: "Invalid plan" });

    if (!user_id)
      return res.status(400).json({ success: false, error: "Missing user_id" });

    if (!process.env.RAZORPAY_KEY_SECRET)
      return res.status(500).json({ success: false, error: "Key secret missing in backend" });

    /* --------------------------------------------
     * VERIFY SIGNATURE
     * -------------------------------------------- */
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.warn("⚠️ Invalid signature. Payment rejected.");
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }

    console.log("✅ Signature Verified");

    /* --------------------------------------------
     * CALCULATE EXPIRY DATE
     * -------------------------------------------- */
    const duration = PLANS[plan].duration;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + duration);

    /* --------------------------------------------
     * UPDATE SUBSCRIPTION IN SUPABASE
     * -------------------------------------------- */
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
      console.error("❌ Subscription update error:", error);
      return res.status(500).json({ success: false, error: "Failed to update subscription" });
    }

    console.log(`🎯 Subscription Updated → ${plan} until ${expiresAt}`);

    return res.json({
      success: true,
      message: "Subscription activated",
      plan,
      expiresAt,
    });

  } catch (err) {
    console.error("❌ verifyPayment error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to verify payment",
    });
  }
};
