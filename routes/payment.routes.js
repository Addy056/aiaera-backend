import express from "express";
import Razorpay from "razorpay";

import {
  createOrder,
  verifyPayment,
  getSubscriptionStatus,
  cancelSubscription,
} from "../controllers/payment.controller.js";

import {
  authMiddleware,
} from "../middleware/auth.js";

const router = express.Router();

/*
========================================
HEALTH CHECK
========================================
*/
router.get(
  "/health",
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Payment routes working ✅",
      timestamp: new Date(),
    });
  }
);

/*
========================================
DEBUG ENV CHECK
========================================
*/
router.get(
  "/debug/env",
  (req, res) => {
    return res.status(200).json({
      success: true,

      razorpay: {
        key_id_exists:
          !!process.env.RAZORPAY_KEY_ID,

        key_secret_exists:
          !!process.env.RAZORPAY_KEY_SECRET,

        key_id_preview:
          process.env.RAZORPAY_KEY_ID
            ? process.env.RAZORPAY_KEY_ID.slice(0, 10) + "..."
            : null,
      },

      node_env:
        process.env.NODE_ENV || "development",
    });
  }
);

/*
========================================
DEBUG RAZORPAY
========================================
*/
router.get(
  "/debug/razorpay",
  async (req, res) => {
    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const order = await razorpay.orders.create({
        amount: 100,
        currency: "INR",
        receipt: `debug_${Date.now()}`,
      });

      return res.status(200).json({
        success: true,
        order,
      });
    } catch (err) {
      console.error("RAZORPAY DEBUG ERROR:", err);

      return res.status(500).json({
        success: false,
        message: err?.message,
        description: err?.description,
        error: err?.error,
        statusCode: err?.statusCode,
      });
    }
  }
);

/*
========================================
CREATE ORDER
========================================
*/
router.post(
  "/create-order",
  authMiddleware,
  async (req, res, next) => {
    try {
      console.log(
        "CREATE ORDER REQUEST RECEIVED"
      );

      console.log(
        "USER:",
        req.user?.id
      );

      console.log(
        "BODY:",
        req.body
      );

      next();
    } catch (error) {
      console.error(
        "CREATE ORDER MIDDLEWARE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
  createOrder
);

/*
========================================
VERIFY PAYMENT
========================================
*/
router.post(
  "/verify",
  authMiddleware,
  async (req, res, next) => {
    try {
      console.log(
        "VERIFY PAYMENT REQUEST"
      );

      console.log(
        "BODY:",
        req.body
      );

      next();
    } catch (error) {
      console.error(
        "VERIFY PAYMENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
  verifyPayment
);

/*
========================================
GET SUBSCRIPTION STATUS
========================================
*/
router.get(
  "/subscription",
  authMiddleware,
  getSubscriptionStatus
);

/*
========================================
CANCEL SUBSCRIPTION
========================================
*/
router.post(
  "/cancel",
  authMiddleware,
  cancelSubscription
);

/*
========================================
DEBUG ROUTES
========================================
*/
router.get(
  "/debug/routes",
  (req, res) => {
    return res.status(200).json({
      success: true,

      routes: {
        health:
          "GET /api/payment/health",

        debugEnv:
          "GET /api/payment/debug/env",

        debugRazorpay:
          "GET /api/payment/debug/razorpay",

        createOrder:
          "POST /api/payment/create-order",

        verifyPayment:
          "POST /api/payment/verify",

        subscription:
          "GET /api/payment/subscription",

        cancel:
          "POST /api/payment/cancel",
      },
    });
  }
);

/*
========================================
404 HANDLER
========================================
*/
router.use(
  "*",
  (req, res) => {
    return res.status(404).json({
      success: false,
      error: "Payment route not found",
      path: req.originalUrl,
    });
  }
);

export default router;