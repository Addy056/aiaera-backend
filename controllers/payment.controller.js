import Razorpay from "razorpay";

import crypto from "crypto";

import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
RAZORPAY INSTANCE
========================================
*/
const razorpay =
  new Razorpay({

    key_id:
      process.env
        .RAZORPAY_KEY_ID,

    key_secret:
      process.env
        .RAZORPAY_KEY_SECRET,
  });

/*
========================================
PLAN CONFIG
========================================
*/
const PLAN_CONFIG = {

  basic: {
    amount: 99900,
    durationDays: 30,
  },

  pro: {
    amount: 199900,
    durationDays: 30,
  },
};

/*
========================================
CREATE ORDER
========================================
*/
export const createOrder =
  async (
    req,
    res
  ) => {

    try {

      console.log(
        "🔥 CREATE ORDER HIT"
      );

      const userId =
        req.user.id;

      const { plan } =
        req.body;

      /*
      ========================================
      VALIDATE PLAN
      ========================================
      */
      if (
        !PLAN_CONFIG[
          plan
        ]
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Invalid subscription plan",
          });
      }

      /*
      ========================================
      CHECK EXISTING SUBSCRIPTION
      ========================================
      */
      const {
        data: existingSubscription,
      } =
        await supabase
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
      AMOUNT
      ========================================
      */
      const amount =
        PLAN_CONFIG[
          plan
        ].amount;

      /*
      ========================================
      CREATE ORDER
      ========================================
      */
      const order =
        await razorpay.orders.create({

          amount,

          currency:
            "INR",

          receipt:
            `aiaera_${userId}_${Date.now()}`,

          notes: {

            userId,

            plan,

            existingPlan:
              existingSubscription?.plan ||
              "none",
          },
        });

      return res.json({

        success: true,

        orderId:
          order.id,

        amount:
          order.amount,

        currency:
          order.currency,

        key:
          process.env
            .RAZORPAY_KEY_ID,
      });

    } catch (err) {

      console.error(
        "❌ CREATE ORDER ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Failed to create order",
        });
    }
  };

/*
========================================
VERIFY PAYMENT
========================================
*/
export const verifyPayment =
  async (
    req,
    res
  ) => {

    try {

      const userId =
        req.user.id;

      const {

        razorpay_order_id,

        razorpay_payment_id,

        razorpay_signature,

        plan,

      } = req.body;

      /*
      ========================================
      VALIDATE BODY
      ========================================
      */
      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature ||
        !plan
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Missing payment details",
          });
      }

      /*
      ========================================
      VALIDATE PLAN
      ========================================
      */
      if (
        !PLAN_CONFIG[
          plan
        ]
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Invalid plan selected",
          });
      }

      /*
      ========================================
      SIGNATURE VERIFY
      ========================================
      */
      const body =
        razorpay_order_id +
        "|" +
        razorpay_payment_id;

      const expectedSignature =
        crypto
          .createHmac(
            "sha256",
            process.env
              .RAZORPAY_KEY_SECRET
          )
          .update(
            body.toString()
          )
          .digest("hex");

      /*
      ========================================
      INVALID SIGNATURE
      ========================================
      */
      if (
        expectedSignature !==
        razorpay_signature
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Invalid payment signature",
          });
      }

      /*
      ========================================
      EXPIRATION
      ========================================
      */
      const expiresAt =
        new Date();

      expiresAt.setDate(
        expiresAt.getDate() +
          PLAN_CONFIG[
            plan
          ]
            .durationDays
      );

      /*
      ========================================
      UPSERT SUBSCRIPTION
      ========================================
      */
      const {
        error:
          subscriptionError,
      } =
        await supabase
          .from(
            "user_subscriptions"
          )
          .upsert({

            user_id:
              userId,

            plan,

            expires_at:
              expiresAt.toISOString(),

            updated_at:
              new Date().toISOString(),
          });

      if (
        subscriptionError
      ) {

        console.error(
          "❌ SUBSCRIPTION ERROR:",
          subscriptionError
        );

        return res
          .status(500)
          .json({

            success:
              false,

            error:
              "Failed to update subscription",
          });
      }

      /*
      ========================================
      SUCCESS
      ========================================
      */
      return res.json({

        success: true,

        message:
          "Payment verified successfully",

        subscription: {

          plan,

          expires_at:
            expiresAt.toISOString(),
        },
      });

    } catch (err) {

      console.error(
        "❌ VERIFY ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Verification failed",
        });
    }
  };

/*
========================================
GET SUBSCRIPTION STATUS
========================================
*/
export const getSubscriptionStatus =
  async (
    req,
    res
  ) => {

    try {

      const userId =
        req.user.id;

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
            userId
          )
          .maybeSingle();

      if (error)
        throw error;

      /*
      ========================================
      NO SUBSCRIPTION
      ========================================
      */
      if (!data) {

        return res.json({

          success: true,

          subscription:
            null,

          expired:
            true,
        });
      }

      /*
      ========================================
      EXPIRATION CHECK
      ========================================
      */
      const expired =
        data.expires_at
          ? new Date(
              data.expires_at
            ) <
            new Date()
          : true;

      return res.json({

        success: true,

        subscription:
          data,

        expired,
      });

    } catch (err) {

      console.error(
        "❌ SUBSCRIPTION STATUS ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Failed to fetch subscription",
        });
    }
  };

/*
========================================
CANCEL SUBSCRIPTION
========================================
*/
export const cancelSubscription =
  async (
    req,
    res
  ) => {

    try {

      const userId =
        req.user.id;

      /*
      ========================================
      EXPIRE SUBSCRIPTION
      ========================================
      */
      const {
        error,
      } =
        await supabase
          .from(
            "user_subscriptions"
          )
          .update({

            expires_at:
              new Date().toISOString(),
          })
          .eq(
            "user_id",
            userId
          );

      if (error)
        throw error;

      return res.json({

        success: true,

        message:
          "Subscription cancelled successfully",
      });

    } catch (err) {

      console.error(
        "❌ CANCEL ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Failed to cancel subscription",
        });
    }
  };