import express from "express";
import {
  createSubscription,
  verifyPayment,
  getSubscriptionStatus,
} from "../controllers/subscriptionsController.js";
import { requireAuth } from "../middleware/authMiddleware.js"; // <-- matches export

const router = express.Router();

router.post("/", requireAuth, createSubscription);
router.post("/verify", requireAuth, verifyPayment);
router.get("/status", requireAuth, getSubscriptionStatus);

export default router;
