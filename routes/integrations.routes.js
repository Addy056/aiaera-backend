import express from "express";

import {
  saveIntegration,
  getIntegration,
  getPublicIntegrations,
  verifyWhatsApp,
  handleWhatsAppWebhook,
} from "../controllers/integrations.controller.js";

import {
  authMiddleware,
} from "../middleware/auth.js";

const router =
  express.Router();

/*
========================================
PUBLIC INTEGRATIONS
USED BY EMBED CHATBOT
========================================
*/
router.get(
  "/public/:chatbotId",
  getPublicIntegrations
);

/*
========================================
USER INTEGRATIONS (PROTECTED)
========================================
*/

// Save integrations
router.post(
  "/",
  authMiddleware,
  saveIntegration
);

// Get integrations
router.get(
  "/",
  authMiddleware,
  getIntegration
);

/*
========================================
WHATSAPP WEBHOOK (PUBLIC)
========================================
*/

// Verification (Meta setup)
router.get(
  "/whatsapp/webhook",
  verifyWhatsApp
);

// Incoming messages
router.post(
  "/whatsapp/webhook",
  handleWhatsAppWebhook
);

/*
========================================
HEALTH CHECK (DEBUG)
========================================
*/
router.get(
  "/test",
  (req, res) => {

    res.json({
      success: true,
      message:
        "Integrations route working ✅",
    });
  }
);

export default router;