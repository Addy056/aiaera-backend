// backend/routes/payment.js
import express from "express";
import { createOrder, verifyPayment } from "../controllers/paymentController.js";

const router = express.Router();

/* ------------------------------------------------------
   Async wrapper to cleanly catch errors
------------------------------------------------------ */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------------------------------------
   HEALTH CHECK
   /api/payment/ping
------------------------------------------------------ */
router.get("/ping", (req, res) => {
  res.json({
    success: true,
    message: "Payment routes are active",
  });
});

/* ------------------------------------------------------
   CREATE RAZORPAY ORDER
   POST /api/payment/create-order
------------------------------------------------------ */
router.post(
  "/create-order",
  asyncHandler(async (req, res) => {
    console.log("💳 [Payment] Create order request:", req.body);
    return createOrder(req, res);
  })
);

/* ------------------------------------------------------
   VERIFY RAZORPAY PAYMENT
   POST /api/payment/verify-payment
------------------------------------------------------ */
router.post(
  "/verify-payment",
  asyncHandler(async (req, res) => {
    console.log("🧾 [Payment] Verify payment request:", req.body);
    return verifyPayment(req, res);
  })
);

/* ------------------------------------------------------
   CATCH-ALL for invalid subroutes
------------------------------------------------------ */
router.all("*", (req, res) => {
  console.warn(`⚠️ Invalid payment route accessed: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "Invalid payment route",
  });
});

/* ------------------------------------------------------
   GLOBAL PAYMENT ROUTE ERROR HANDLER
------------------------------------------------------ */
router.use((err, req, res, next) => {
  console.error("❌ Payment Route Error:", err.message);
  res.status(500).json({
    success: false,
    error: "Internal server error in payment route",
  });
});

export default router;
