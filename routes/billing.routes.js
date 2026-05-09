import express from "express";
import {
  createOrder,
  verifyPayment,
  getSubscription
} from "../controllers/billing.controller.js";

import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Create Razorpay order
router.post("/create-order", authMiddleware, createOrder);

// Verify payment
router.post("/verify", authMiddleware, verifyPayment);

// Get subscription status
router.get("/status", authMiddleware, getSubscription);

export default router;