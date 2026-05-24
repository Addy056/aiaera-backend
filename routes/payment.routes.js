import express from "express";

import {
  createOrder,
  verifyPayment,
  getSubscriptionStatus,
  cancelSubscription,
} from "../controllers/payment.controller.js";

import {
  authMiddleware,
} from "../middleware/auth.js";

const router =
  express.Router();

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

      message:
        "Payment routes working ✅",
    });
  }
);

/*
========================================
CREATE ORDER
========================================
Plans:
- basic
- pro
========================================
*/
router.post(
  "/create-order",
  authMiddleware,
  createOrder
);

/*
========================================
VERIFY PAYMENT
========================================
After successful Razorpay payment
========================================
*/
router.post(
  "/verify",
  authMiddleware,
  verifyPayment
);

/*
========================================
GET SUBSCRIPTION STATUS
========================================
Returns:
- plan
- expires_at
- expired state
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
Disables future renewals
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

export default router;