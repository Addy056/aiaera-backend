import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
PLAN TYPES
========================================
*/
export const PLAN_TYPES = {

  FREE: "free",

  BASIC: "basic",

  PRO: "pro",
};

/*
========================================
PLAN FEATURES
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
CHECK SUBSCRIPTION
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
      DATABASE ERROR
      ========================================
      */
      if (error) {

        console.error(
          "❌ Subscription fetch error:",
          error
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

      /*
      ========================================
      NO SUBSCRIPTION
      ========================================
      */
      if (!data) {

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
      EXPIRY CHECK
      ========================================
      */
      const expired =
        data?.expires_at
          ? new Date(
              data.expires_at
            ).getTime() <
            Date.now()
          : true;

      const active =
        !expired;

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

        expired,

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
REQUIRE SUBSCRIPTION
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
     const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS || ""
)
  .split(",")
  .map((email) =>
    email.trim().toLowerCase()
  )
  .filter(Boolean);

if (
  req.user?.email &&
  ADMIN_EMAILS.includes(
    req.user.email
      .trim()
      .toLowerCase()
  )
) {
  req.subscription = {
    plan: PLAN_TYPES.PRO,
    expires_at:
      "2099-12-31T23:59:59.999Z",
  };

  req.plan =
    PLAN_TYPES.PRO;

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
      return next();

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
FEATURE ACCESS MIDDLEWARE
========================================
Usage:
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
        FEATURE VALIDATION
        ========================================
        */
        if (
          !Object.keys(
            PLAN_FEATURES.pro
          ).includes(featureName)
        ) {

          return res
            .status(400)
            .json({

              success:
                false,

              error:
                "Invalid feature requested",
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
            });
        }

        /*
        ========================================
        FEATURE ACCESS
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

              current_plan:
                result.plan,

              error:
                `Your current plan does not include ${featureName}`,
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
        return next();

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