// backend/routes/integrations.js

import express from "express";
import {
  verifyMetaWebhook,
  handleMetaWebhook,
  handleCalendlyWebhook,
  getUserIntegrations,
  updateUserIntegrations,
} from "../controllers/integrationsController.js";

const router = express.Router();

/* ================================================================
   META WEBHOOKS (WhatsApp / FB / Instagram)
   Includes BOTH new + legacy routes for backward compatibility
=============================================================== */

// GET → Webhook verification
router.get("/meta-webhook", verifyMetaWebhook);
router.get("/meta", verifyMetaWebhook);

// POST → Incoming events (WhatsApp messages, FB, IG)
router.post("/meta-webhook", handleMetaWebhook);
router.post("/meta", handleMetaWebhook);

/* ================================================================
   CALENDLY WEBHOOKS
   Supports both clean and legacy paths
=============================================================== */

router.post("/calendly-webhook", handleCalendlyWebhook);
router.post("/calendly", handleCalendlyWebhook);

/* ================================================================
   USER INTEGRATIONS CRUD
   Save: POST /api/integrations
   Fetch: GET  /api/integrations?user_id=xxx
=============================================================== */

// Save or update integrations (WhatsApp, FB, IG, Business Info, Meeting Links)
router.post("/", updateUserIntegrations);

// Fetch user integrations
router.get("/", getUserIntegrations);

/* ================================================================
   ROUTE-LEVEL ERROR HANDLER
=============================================================== */

router.use((err, req, res, next) => {
  console.error("❌ [Integrations Route Error]:", err.stack || err.message);

  return res.status(err.statusCode || 500).json({
    success: false,
    message: "Internal error in integrations module",
    details: err.message || "Unexpected error occurred",
  });
});

export default router;
