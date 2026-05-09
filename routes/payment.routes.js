import express from "express";
import { createOrder, verifyPayment } from "../controllers/payment.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);
router.post("/verify", authMiddleware, verifyPayment);

export default router;