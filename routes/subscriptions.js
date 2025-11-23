// backend/routes/subscriptions.js
import express from "express";
import {
  createSubscription,
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
 * Validate user’s chosen plan.
 * This DOES NOT create Razorpay order anymore.
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
 * GET /api/subscriptions/status
 * Return user subscription status
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
 * 404 Fallback for unknown routes
 */
router.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Invalid subscription endpoint: ${req.originalUrl}`,
  });
});

export default router;
