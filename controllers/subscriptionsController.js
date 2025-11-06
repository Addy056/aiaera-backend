// backend/controllers/subscriptionsController.js
import supabase from "../config/supabaseClient.js";
import crypto from "crypto";

/**
 * Create a new subscription (via Razorpay order)
 */
export const createSubscription = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const userId = req.user?.id;

    if (!plan) {
      return res.status(400).json({ error: "Plan is required" });
    }

    // TODO: Replace with Razorpay order creation
    // For now, just placeholder orderId
    const fakeOrderId = "order_" + crypto.randomBytes(8).toString("hex");

    res.status(201).json({
      message: "Subscription order created",
      orderId: fakeOrderId,
      plan,
    });
  } catch (err) {
    console.error("❌ Create subscription error:", err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
};

/**
 * Verify payment (Razorpay signature verification)
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } =
      req.body;
    const userId = req.user?.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment details" });
    }

    // 🔑 Signature verification
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // ⏳ Set subscription expiry = now + 30 days
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // ✅ Upsert subscription in Supabase
    const { error } = await supabase
      .from("user_subscriptions")
      .upsert(
        {
          user_id: userId,
          plan,
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) throw error;

    res.json({
      message: "Payment verified and subscription activated",
      plan,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("❌ Verify payment error:", err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
};

/**
 * Get current subscription status
 */
export const getSubscriptionStatus = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    // ✅ Free forever test account (use env var instead of hardcoding)
    if (userEmail && userEmail === process.env.FREE_TEST_EMAIL) {
      return res.json({
        active: true,
        plan: "Free Forever",
        expires_at: "2999-12-31T23:59:59Z",
      });
    }

    // 🔹 Fetch subscription info
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("plan, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    let isActive = false;
    let expiry = null;

    if (data?.expires_at) {
      expiry = new Date(data.expires_at);
      if (expiry > new Date()) {
        isActive = true;
      }
    }

    res.json({
      active: isActive,
      plan: data?.plan || "Free",
      expires_at: data?.expires_at || null,
    });
  } catch (err) {
    console.error("❌ Get subscription status error:", err);
    res.status(500).json({ error: "Failed to fetch subscription status" });
  }
};
