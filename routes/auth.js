// backend/routes/auth.js
import express from "express";
import { signup, login } from "../controllers/authController.js";

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user (Supabase Admin API)
 * @access  Public
 */
router.post("/signup", signup);

/**
 * @route   POST /api/auth/login
 * @desc    Disabled — Login must be handled via Supabase client on frontend
 * @access  Public (but always returns 400)
 */
router.post("/login", (req, res) => {
  console.warn("⚠️ Backend login attempt blocked:", {
    ip: req.ip,
    email: req.body?.email
  });

  return login(req, res);
});

export default router;
