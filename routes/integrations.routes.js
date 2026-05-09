import express from "express";
import {
  saveIntegration,
  getIntegration,
  verifyWhatsApp,
  handleWhatsAppWebhook
} from "../controllers/integrations.controller.js";

import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

/*
========================================
USER INTEGRATIONS (PROTECTED)
========================================
*/

// Save integrations
router.post("/", authMiddleware, saveIntegration);

// Get integrations
router.get("/", authMiddleware, getIntegration);


/*
========================================
WHATSAPP WEBHOOK (PUBLIC)
========================================
*/

// Verification (Meta setup)
router.get("/whatsapp/webhook", verifyWhatsApp);

// Incoming messages
router.post("/whatsapp/webhook", handleWhatsAppWebhook);


/*
========================================
HEALTH CHECK (DEBUG)
========================================
*/

router.get("/test", (req, res) => {
  res.json({ message: "Integrations route working ✅" });
});

export default router;