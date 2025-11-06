// backend/routes/payment.js
import express from "express";
import {
  createOrder,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

/**
 * ------------------------------------------------------
 * Payment Routes (Razorpay)
 * ------------------------------------------------------
 */

// Create Razorpay order
router.post("/create-order", async (req, res, next) => {
  try {
    await createOrder(req, res);
  } catch (err) {
    console.error("❌ Error in POST /payment/create-order:", err.stack || err.message);
    next(err);
  }
});

// Verify Razorpay payment
router.post("/verify-payment", async (req, res, next) => {
  try {
    await verifyPayment(req, res);
  } catch (err) {
    console.error("❌ Error in POST /payment/verify-payment:", err.stack || err.message);
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
    error: "Internal server error in payment route",
    message: err.message || "Unexpected error",
  });
});

export default router;
