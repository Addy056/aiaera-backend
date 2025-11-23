// backend/middleware/authMiddleware.js
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  NODE_ENV,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "[AuthMiddleware] Missing SUPABASE_URL or SUPABASE_ANON_KEY."
  );
}

// Backend Supabase client (no session persistence)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * -----------------------------------------------------
 * 🔐 requireAuth()
 * Validates JWT access token from Supabase
 * -----------------------------------------------------
 */
export const requireAuth = async (req, res, next) => {
  try {
    const rawAuth = req.headers.authorization || req.headers.Authorization;

    if (!rawAuth || !rawAuth.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authorization token missing",
      });
    }

    const token = rawAuth.split(" ")[1];

    if (!token || token.toLowerCase() === "undefined") {
      return res.status(401).json({
        success: false,
        error: "Invalid token provided",
      });
    }

    // Validate token via Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      if (NODE_ENV !== "production") {
        console.error("❌ Token validation failed:", error?.message);
      }
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    // Attach safe user object
    req.user = {
      id: data.user.id,
      email: data.user.email,
    };

    return next();
  } catch (err) {
    console.error("🔥 requireAuth error:", err);
    return res.status(500).json({
      success: false,
      error: "Authentication server error",
    });
  }
};


/**
 * -----------------------------------------------------
 * 🔐 requireAuthAndSubscription()
 * 1) Validates JWT
 * 2) Verifies active subscription
 * -----------------------------------------------------
 */
export const requireAuthAndSubscription = async (req, res, next) => {
  try {
    // First run requireAuth()
    await requireAuth(req, res, async () => {
      const userId = req.user.id;

      // Fetch subscription
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("plan, expires_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("❌ Subscription lookup error:", error.message);
        return res.status(500).json({
          success: false,
          error: "Subscription lookup failed",
        });
      }

      // No subscription
      if (!data) {
        return res.status(403).json({
          success: false,
          error: "No active subscription",
        });
      }

      // Expired subscription
      if (!data.expires_at || new Date(data.expires_at) <= new Date()) {
        return res.status(403).json({
          success: false,
          error: "Subscription expired",
        });
      }

      req.subscription = data;
      next();
    });
  } catch (err) {
    console.error("🔥 requireAuthAndSubscription error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Authentication/subscription error",
    });
  }
};
