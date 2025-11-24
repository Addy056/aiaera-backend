// backend/routes/integrations.js

import express from "express";
import {
  verifyMetaWebhook,
  handleMetaWebhook,
  handleCalendlyWebhook,
  getIntegrations,      // ✅ correct name
  saveIntegrations,     // ✅ correct name
} from "../controllers/integrationsController.js";

const router = express.Router();

/* ================================================================
   META WEBHOOKS (WhatsApp / FB / Instagram)
=============================================================== */

// GET → Webhook verification
router.get("/meta-webhook", verifyMetaWebhook);
router.get("/meta", verifyMetaWebhook);

// POST → Incoming WhatsApp / FB / IG messages
router.post("/meta-webhook", handleMetaWebhook);
router.post("/meta", handleMetaWebhook);

/* ================================================================
   CALENDLY WEBHOOKS
=============================================================== */

router.post("/calendly-webhook", handleCalendlyWebhook);
router.post("/calendly", handleCalendlyWebhook);

/* ================================================================
   USER INTEGRATIONS CRUD
=============================================================== */

// Save/update integrations
router.post("/", saveIntegrations);

// Fetch integrations for a user
router.get("/", getIntegrations);

/* ================================================================
   ERROR HANDLER
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
