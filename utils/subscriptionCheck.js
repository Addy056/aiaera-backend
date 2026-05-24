import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
PLAN CONFIG
========================================
*/
export const PLAN_TYPES = {

  FREE: "free",

  BASIC: "basic",

  PRO: "pro",
};

/*
========================================
FEATURE ACCESS
========================================
*/
export const PLAN_FEATURES = {

  free: {

    website_chatbot: true,

    whatsapp: false,

    facebook: false,

    instagram: false,

    appointments: false,

    leads_export: false,
  },

  basic: {

    website_chatbot: true,

    whatsapp: false,

    facebook: false,

    instagram: false,

    appointments: false,

    leads_export: true,
  },

  pro: {

    website_chatbot: true,

    whatsapp: true,

    facebook: true,

    instagram: true,

    appointments: true,

    leads_export: true,
  },
};

/*
========================================
CHECK SUBSCRIPTION HELPER
========================================
Returns:
- active
- expired
- plan
- subscription
- features
========================================
*/
export const checkSubscription =
  async (
    user_id
  ) => {

    try {

      /*
      ========================================
      VALIDATION
      ========================================
      */
      if (!user_id) {

        return {

          active:
            false,

          expired:
            true,

          plan:
            PLAN_TYPES.FREE,

          features:
            PLAN_FEATURES.free,

          subscription:
            null,
        };
      }

      /*
      ========================================
      GET SUBSCRIPTION
      ========================================
      */
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "user_subscriptions"
          )
          .select("*")
          .eq(
            "user_id",
            user_id
          )
          .maybeSingle();

      /*
      ========================================
      NO SUBSCRIPTION
      ========================================
      */
      if (
        error ||
        !data
      ) {

        return {

          active:
            false,

          expired:
            true,

          plan:
            PLAN_TYPES.FREE,

          features:
            PLAN_FEATURES.free,

          subscription:
            null,
        };
      }

      /*
      ========================================
      PLAN
      ========================================
      */
      const plan =
        (
          data.plan ||
          PLAN_TYPES.FREE
        ).toLowerCase();

      /*
      ========================================
      DATE CHECK
      ========================================
      */
      const now =
        new Date();

      const expiry =
        new Date(
          data.expires_at
        );

      const active =
        expiry > now;

      /*
      ========================================
      FEATURES
      ========================================
      */
      const features =
        PLAN_FEATURES[
          plan
        ] ||
        PLAN_FEATURES.free;

      /*
      ========================================
      RETURN
      ========================================
      */
      return {

        active,

        expired:
          !active,

        plan,

        features,

        subscription:
          data,
      };

    } catch (err) {

      console.error(
        "❌ CHECK SUBSCRIPTION ERROR:",
        err
      );

      return {

        active:
          false,

        expired:
          true,

        plan:
          PLAN_TYPES.FREE,

        features:
          PLAN_FEATURES.free,

        subscription:
          null,
      };
    }
  };

/*
========================================
SUBSCRIPTION MIDDLEWARE
========================================
Protects premium routes
========================================
*/
export const requireSubscription =
  async (
    req,
    res,
    next
  ) => {

    try {

      /*
      ========================================
      USER CHECK
      ========================================
      */
      if (
        !req.user?.id
      ) {

        return res
          .status(401)
          .json({

            success:
              false,

            error:
              "Unauthorized",
          });
      }

      /*
      ========================================
      ADMIN BYPASS
      ========================================
      */
      const ADMIN_EMAILS = [

        "dhawaleaditya077@gmail.com",
      ];

      if (
        ADMIN_EMAILS.includes(
          req.user.email
        )
      ) {

        req.subscription = {

          plan:
            PLAN_TYPES.PRO,
        };

        req.features =
          PLAN_FEATURES.pro;

        return next();
      }

      /*
      ========================================
      CHECK SUBSCRIPTION
      ========================================
      */
      const result =
        await checkSubscription(
          req.user.id
        );

      /*
      ========================================
      EXPIRED
      ========================================
      */
      if (
        !result.active
      ) {

        return res
          .status(403)
          .json({

            success:
              false,

            expired:
              true,

            error:
              "Subscription expired",

            plan:
              result.plan,

            subscription:
              result.subscription,
          });
      }

      /*
      ========================================
      ATTACH
      ========================================
      */
      req.subscription =
        result.subscription;

      req.plan =
        result.plan;

      req.features =
        result.features;

      /*
      ========================================
      CONTINUE
      ========================================
      */
      next();

    } catch (err) {

      console.error(
        "❌ SUBSCRIPTION MIDDLEWARE ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Subscription validation failed",
        });
    }
  };

/*
========================================
PLAN ACCESS MIDDLEWARE
========================================
Example:
requireFeatureAccess("whatsapp")
========================================
*/
export const requireFeatureAccess =
  (
    featureName
  ) => {

    return async (
      req,
      res,
      next
    ) => {

      try {

        /*
        ========================================
        USER CHECK
        ========================================
        */
        if (
          !req.user?.id
        ) {

          return res
            .status(401)
            .json({

              success:
                false,

              error:
                "Unauthorized",
            });
        }

        /*
        ========================================
        CHECK SUBSCRIPTION
        ========================================
        */
        const result =
          await checkSubscription(
            req.user.id
          );

        /*
        ========================================
        SUBSCRIPTION EXPIRED
        ========================================
        */
        if (
          !result.active
        ) {

          return res
            .status(403)
            .json({

              success:
                false,

              expired:
                true,

              error:
                "Subscription expired",
            });
        }

        /*
        ========================================
        FEATURE CHECK
        ========================================
        */
        const hasAccess =
          result.features?.[
            featureName
          ];

        if (
          !hasAccess
        ) {

          return res
            .status(403)
            .json({

              success:
                false,

              upgrade_required:
                true,

              error:
                `Your current plan does not include ${featureName} access`,

              current_plan:
                result.plan,
            });
        }

        /*
        ========================================
        ATTACH
        ========================================
        */
        req.subscription =
          result.subscription;

        req.plan =
          result.plan;

        req.features =
          result.features;

        /*
        ========================================
        CONTINUE
        ========================================
        */
        next();

      } catch (err) {

        console.error(
          "❌ FEATURE ACCESS ERROR:",
          err
        );

        return res
          .status(500)
          .json({

            success:
              false,

            error:
              "Feature validation failed",
          });
      }
    };
  };