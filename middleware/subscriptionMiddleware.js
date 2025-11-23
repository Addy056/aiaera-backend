// backend/middleware/subscriptionMiddleware.js
import supabase from "../config/supabaseClient.js";

/**
 * Enforces that a user must have an active subscription.
 * Automatically supports:
 * - Free plan (expired unless expires_at is in future)
 * - Admin bypass (email from env)
 * - Silent auto-create free record (optional)
 */
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId) {
      return res.status(401).json({ success: false, error: "User not authenticated" });
    }

    /* ---------------------------------------------------
     * 1️⃣ Admin Bypass (Environment-Safe)
     * --------------------------------------------------- */
    const ADMIN_EMAIL = process.env.FREE_TEST_EMAIL || "aiaera056@gmail.com";

    if (userEmail === ADMIN_EMAIL) {
      req.subscription = {
        plan: "admin",
        expires_at: "2099-12-31T23:59:59Z",
      };

      if (process.env.NODE_ENV !== "production") {
        console.log(`🎉 [Subscription] Admin bypass → ${userEmail}`);
      }

      return next();
    }

    /* ---------------------------------------------------
     * 2️⃣ Fetch Subscription
     * --------------------------------------------------- */
    const { data: subscription, error } = await supabase
      .from("user_subscriptions")
      .select("plan, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("❌ [Subscription] Supabase error:", error.message);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch subscription",
      });
    }

    /* ---------------------------------------------------
     * 3️⃣ No Subscription Found → Treat as FREE (expired)
     * --------------------------------------------------- */
    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: "No active subscription. Please upgrade.",
        plan: "free",
      });
    }

    /* ---------------------------------------------------
     * 4️⃣ Check Expiration (UTC-safe)
     * --------------------------------------------------- */
    const now = new Date();
    const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;

    if (!expiresAt || isNaN(expiresAt.getTime())) {
      console.warn("⚠️ [Subscription] Invalid expires_at for user", userId);
      return res.status(403).json({
        success: false,
        error: "Subscription expired",
      });
    }

    if (expiresAt <= now) {
      console.warn(
        `⚠️ [Subscription] Expired → User ${userId}, Plan ${subscription.plan}, Expired: ${expiresAt}`
      );
      return res.status(403).json({
        success: false,
        error: "Subscription expired",
        expires_at: subscription.expires_at,
      });
    }

    /* ---------------------------------------------------
     * 5️⃣ ACTIVE → Attach & Continue
     * --------------------------------------------------- */
    req.subscription = subscription;

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `✅ [Subscription] Active → User ${userId}, Plan ${subscription.plan}, Expires: ${expiresAt}`
      );
    }

    return next();
  } catch (err) {
    console.error("❌ [Subscription] Middleware error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
