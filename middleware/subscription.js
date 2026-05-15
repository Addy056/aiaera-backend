import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
SUBSCRIPTION MIDDLEWARE
========================================
Checks:
- active subscription
- expiration date
- valid plan
- attaches subscription
========================================
*/

export const checkSubscription =
  async (
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

          error:
            "Unauthorized access",
        });
      }

      const userId =
        req.user.id;

      /*
      ========================================
      DEV BYPASS
      ========================================
      */
      const DEV_EMAIL =
        "aiaera056@gmail.com";

      if (
        req.user.email ===
        DEV_EMAIL
      ) {

        console.log(
          "✅ DEV ACCOUNT BYPASS"
        );

        req.subscription = {
          id: "dev-bypass",

          plan: "pro",

          expires_at:
            "2099-12-31",

          active: true,
        };

        return next();
      }

      /*
      ========================================
      GET SUBSCRIPTION
      ========================================
      */
      const {
        data: subscription,
        error,
      } = await supabase
        .from(
          "user_subscriptions"
        )
        .select("*")
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

      /*
      ========================================
      DATABASE ERROR
      ========================================
      */
      if (error) {

        console.error(
          "❌ SUBSCRIPTION FETCH ERROR:",
          error
        );

        return res.status(500).json({
          success: false,

          error:
            "Subscription validation failed",
        });
      }

      /*
      ========================================
      NO SUBSCRIPTION
      ========================================
      */
      if (!subscription) {

        return res.status(403).json({
          success: false,

          error:
            "No active subscription found",
        });
      }

      /*
      ========================================
      VALIDATE PLAN
      ========================================
      */
      const validPlans = [
        "free",
        "basic",
        "pro",
      ];

      const userPlan =
        subscription.plan
          ?.toLowerCase();

      if (
        !validPlans.includes(
          userPlan
        )
      ) {

        console.error(
          "❌ INVALID PLAN:",
          subscription.plan
        );

        return res.status(403).json({
          success: false,

          error:
            "Invalid subscription plan",
        });
      }

      /*
      ========================================
      FREE PLAN
      ========================================
      */
      if (
        userPlan === "free"
      ) {

        req.subscription = {
          id:
            subscription.id,

          plan:
            "free",

          expires_at:
            null,

          active:
            true,
        };

        return next();
      }

      /*
      ========================================
      EXPIRATION CHECK
      ========================================
      */
      if (
        !subscription.expires_at
      ) {

        return res.status(403).json({
          success: false,

          error:
            "Subscription expired",
        });
      }

      const currentDate =
        new Date();

      const expiryDate =
        new Date(
          subscription.expires_at
        );

      /*
      ========================================
      INVALID DATE
      ========================================
      */
      if (
        isNaN(
          expiryDate.getTime()
        )
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
      if (
        expiryDate <=
        currentDate
      ) {

        return res.status(403).json({
          success: false,

          error:
            "Subscription expired",

          expired: true,
        });
      }

      /*
      ========================================
      ATTACH SUBSCRIPTION
      ========================================
      */
      req.subscription = {
        id:
          subscription.id,

        plan:
          userPlan,

        expires_at:
          subscription.expires_at,

        active:
          true,
      };

      /*
      ========================================
      CONTINUE
      ========================================
      */
      next();

    } catch (err) {

      console.error(
        "❌ SUBSCRIPTION MIDDLEWARE ERROR:",
        err.message || err
      );

      return res.status(500).json({
        success: false,

        error:
          "Server error during subscription validation",
      });
    }
  };