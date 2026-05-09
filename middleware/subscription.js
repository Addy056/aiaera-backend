import { supabase } from "../config/supabaseClient.js";

/*
========================================
SUBSCRIPTION MIDDLEWARE
========================================
Checks:
- active subscription
- expiration date
- attaches subscription info
========================================
*/

export const checkSubscription = async (
  req,
  res,
  next
) => {
  try {
    /*
    ========================================
    USER VALIDATION
    ========================================
    */
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const userId = req.user.id;

    /*
    ========================================
    GET SUBSCRIPTION
    ========================================
    */
    const {
      data,
      error,
    } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    /*
    ========================================
    DATABASE ERROR
    ========================================
    */
    if (error) {
      console.error(
        "SUBSCRIPTION FETCH ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Subscription check failed",
      });
    }

    /*
    ========================================
    NO SUBSCRIPTION FOUND
    ========================================
    */
    if (!data) {
      return res.status(403).json({
        success: false,
        error: "No active subscription",
      });
    }

    /*
    ========================================
    VALIDATE EXPIRATION
    ========================================
    */
    if (!data.expires_at) {
      return res.status(403).json({
        success: false,
        error:
          "Subscription expired",
      });
    }

    const currentDate =
      new Date();

    const expiryDate =
      new Date(data.expires_at);

    /*
    ========================================
    INVALID DATE
    ========================================
    */
    if (
      isNaN(expiryDate.getTime())
    ) {
      return res.status(403).json({
        success: false,
        error:
          "Invalid subscription date",
      });
    }

    /*
    ========================================
    EXPIRED SUBSCRIPTION
    ========================================
    */
    if (expiryDate <= currentDate) {
      return res.status(403).json({
        success: false,
        error:
          "Subscription expired",
      });
    }

    /*
    ========================================
    ATTACH SUBSCRIPTION
    ========================================
    */
    req.subscription = {
      id: data.id,
      plan: data.plan,
      expires_at:
        data.expires_at,
    };

    /*
    ========================================
    CONTINUE
    ========================================
    */
    next();

  } catch (err) {

    console.error(
      "SUBSCRIPTION MIDDLEWARE ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      error:
        "Server error during subscription validation",
    });
  }
};