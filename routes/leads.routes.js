import express from "express";
import {
  createLead,
  getLeads
} from "../controllers/leads.controller.js";

import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Save lead (from chatbot)
router.post("/", createLead);

// Get all leads (dashboard)
router.get("/", authMiddleware, getLeads);

export default router;