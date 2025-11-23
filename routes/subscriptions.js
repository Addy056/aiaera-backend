// backend/routes/subscriptions.js
import express from "express";
import {
  createSubscription,
  verifyPayment,
  getSubscriptionStatus,
} from "../controllers/subscriptionsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------------------------------------
   Subscription Routes (All Require Auth)
   Mounted at: /api/subscriptions
-------------------------------------------------- */

/**
 * POST /api/subscriptions
 * Create subscription order (Razorpay)
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    await createSubscription(req, res);
  } catch (err) {
    console.error("❌ Error in POST /subscriptions:", err);
    next(err);
  }
});

/**
 * POST /api/subscriptions/verify
 * Verify Razorpay payment
 */
router.post("/verify", requireAuth, async (req, res, next) => {
  try {
    await verifyPayment(req, res);
  } catch (err) {
    console.error("❌ Error in POST /subscriptions/verify:", err);
    next(err);
  }
});

/**
 * GET /api/subscriptions/status
 * Check if user's subscription is active
 */
router.get("/status", requireAuth, async (req, res, next) => {
  try {
    await getSubscriptionStatus(req, res);
  } catch (err) {
    console.error("❌ Error in GET /subscriptions/status:", err);
    next(err);
  }
});

/**
 * 404 Fallback
 */
router.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Invalid subscription endpoint: ${req.originalUrl}`,
  });
});

export default router;
