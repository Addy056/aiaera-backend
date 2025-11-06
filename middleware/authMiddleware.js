// backend/middleware/authMiddleware.js
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY, // Frontend key for validating JWTs
  NODE_ENV,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "[AuthMiddleware] Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables."
  );
}

// Supabase client for auth validation (anon key)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Middleware to require authentication
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, error: "Authorization token required" });
    }

    const token = authHeader.split(" ")[1];

    // Validate JWT using Supabase public key
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      if (NODE_ENV !== "production") {
        console.error("❌ Token validation error:", error?.message);
      }
      return res
        .status(401)
        .json({ success: false, error: "Invalid or expired token" });
    }

    // Attach safe user object
    req.user = {
      id: data.user.id,
      email: data.user.email,
    };

    return next();
  } catch (err) {
    console.error("❌ requireAuth unexpected error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Authentication failed due to server error" });
  }
};

/**
 * Middleware factory to require auth + subscription
 */
export const requireAuthAndSubscription = (checkSubscription) => {
  return async (req, res, next) => {
    try {
      await requireAuth(req, res, async () => {
        if (typeof checkSubscription === "function") {
          const subscription = await checkSubscription(req.user.id);
          if (!subscription || new Date(subscription.expires_at) <= new Date()) {
            return res
              .status(403)
              .json({ success: false, error: "Subscription expired or not found" });
          }
          req.subscription = subscription;
        }
        return next();
      });
    } catch (err) {
      console.error("❌ requireAuthAndSubscription error:", err);
      return res
        .status(500)
        .json({ success: false, error: "Server error during auth/subscription check" });
    }
  };
};
