// backend/routes/payment.js
import express from "express";
import { createOrder, verifyPayment } from "../controllers/paymentController.js";

const router = express.Router();

/**
 * ------------------------------------------------------
 * ✅ Payment Routes (Razorpay)
 * ------------------------------------------------------
 * Mounted at: /api/payment
 * Example endpoints:
 *   POST /api/payment/create-order
 *   POST /api/payment/verify-payment
 *   GET  /api/payment/ping  ← health check
 * ------------------------------------------------------
 */

// Simple test route to verify connection
router.get("/ping", (req, res) => {
  console.log("✅ /api/payment/ping called");
  res.json({ success: true, message: "Payment routes are active" });
});

// Create Razorpay order
router.post("/create-order", async (req, res, next) => {
  try {
    console.log("💳 POST /api/payment/create-order hit with body:", req.body);
    await createOrder(req, res);
  } catch (err) {
    console.error("❌ Error in POST /api/payment/create-order:", err.stack || err.message);
    next(err);
  }
});

// Verify Razorpay payment
router.post("/verify-payment", async (req, res, next) => {
  try {
    console.log("🧾 POST /api/payment/verify-payment hit with body:", req.body);
    await verifyPayment(req, res);
  } catch (err) {
    console.error("❌ Error in POST /api/payment/verify-payment:", err.stack || err.message);
    next(err);
  }
});

/**
 * ------------------------------------------------------
 * Global Error Handling for Payment Routes
 * ------------------------------------------------------
 */
router.use((err, req, res, next) => {
  console.error("❌ Payment route unhandled error:", err.stack || err.message);
  res.status(500).json({
    success: false,
    error: "Internal server error in payment route",
    message: err.message || "Unexpected error",
  });
});

export default router;
