// backend/middleware/subscriptionMiddleware.js
import supabase from "../config/supabaseClient.js";

/**
 * Middleware to enforce active subscription for authenticated users.
 * Attaches subscription info to req.subscription if valid.
 */
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // ✅ Free bypass for admin
    if (userEmail === "aiaera056@gmail.com") {
      if (process.env.NODE_ENV !== "production") {
        console.log(`🎉 [Subscription] Free access granted for ${userEmail}`);
      }
      req.subscription = { plan: "admin", expires_at: "2099-12-31T23:59:59Z" };
      return next();
    }

    // 🔹 Fetch subscription info
    const { data: subscription, error } = await supabase
      .from("user_subscriptions")
      .select("plan, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("❌ [Subscription] Supabase query error:", error.message || error);
      return res.status(500).json({ error: "Error fetching subscription" });
    }

    if (!subscription) {
      return res.status(403).json({ error: "Subscription not found" });
    }

    // 🔹 Check expiration (UTC safe)
    const now = new Date();
    const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;

    if (!expiresAt || expiresAt <= now) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `⚠️ [Subscription] Expired for user ${userId} (Plan: ${subscription.plan})`
        );
      }
      return res.status(403).json({ error: "Subscription expired" });
    }

    // ✅ Subscription active → attach to request
    req.subscription = subscription;

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `✅ [Subscription] Active for ${userId} (Plan: ${subscription.plan}), expires: ${expiresAt.toISOString()}`
      );
    }

    return next();
  } catch (err) {
    console.error("❌ [Subscription] Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
