// backend/controllers/subscriptionsController.js
import supabase from "../config/supabaseClient.js";

/* ----------------------------------------------------
 * 1) GET USER SUBSCRIPTION STATUS
 * ---------------------------------------------------- */
export const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // 🔓 Free forever test account (controlled via env)
    const FREE_TEST_EMAIL = process.env.FREE_TEST_EMAIL || null;

    if (FREE_TEST_EMAIL && userEmail === FREE_TEST_EMAIL) {
      return res.json({
        success: true,
        plan: "pro",
        active: true,
        expires_at: "2999-12-31T23:59:59Z",
        free_test: true,
      });
    }

    // Fetch subscription record
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("plan, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase error (getSubscriptionStatus):", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch subscription",
      });
    }

    // No subscription found → treat as free
    if (!data) {
      return res.json({
        success: true,
        plan: "free",
        active: false,
        expires_at: null,
      });
    }

    const now = new Date();
    const expiry = new Date(data.expires_at);
    const isActive = expiry > now;

    return res.json({
      success: true,
      plan: data.plan || "free",
      active: isActive,
      expires_at: data.expires_at,
    });

  } catch (err) {
    console.error("❌ Error (getSubscriptionStatus):", err);
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

/* ----------------------------------------------------
 * 2) CREATE SUBSCRIPTION (PLAN VALIDATION ONLY)
 *
 * IMPORTANT:
 * - This DOES NOT create Razorpay orders.
 * - Razorpay flow happens inside paymentController.js
 * ---------------------------------------------------- */
export const createSubscription = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const allowedPlans = ["free", "basic", "pro"];
    if (!allowedPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        error: "Invalid plan",
      });
    }

    return res.json({
      success: true,
      message: "Plan validated. Use /api/payment/create-order to proceed.",
      plan,
    });

  } catch (err) {
    console.error("❌ Error (createSubscription):", err);
    return res.status(500).json({
      success: false,
      error: "Failed to process subscription",
    });
  }
};
