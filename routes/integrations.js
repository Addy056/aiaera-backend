import express from "express";
import {
  verifyMetaWebhook,
  handleMetaWebhook,
  handleCalendlyWebhook,
  saveIntegrations,
  getIntegrations,
} from "../controllers/integrationsController.js";

const router = express.Router();

/* --------------------------------------------------------------------
   META (WhatsApp / FB / IG) WEBHOOKS
   Both legacy + clean paths kept for backward compatibility
-------------------------------------------------------------------- */

// Verification (GET)
router.get("/meta-webhook", verifyMetaWebhook);
router.get("/meta", verifyMetaWebhook);

// Incoming events (POST)
router.post("/meta-webhook", handleMetaWebhook);
router.post("/meta", handleMetaWebhook);

/* --------------------------------------------------------------------
   CALENDLY WEBHOOKS
   Legacy + clean endpoints
-------------------------------------------------------------------- */
router.post("/calendly-webhook", handleCalendlyWebhook);
router.post("/calendly", handleCalendlyWebhook);

/* --------------------------------------------------------------------
   USER INTEGRATIONS (CRUD)
-------------------------------------------------------------------- */

// Save or update integrations
router.post("/", saveIntegrations);

// Fetch integrations by ?user_id=
router.get("/", getIntegrations);

/* --------------------------------------------------------------------
   ERROR HANDLER FOR THIS ROUTER ONLY
-------------------------------------------------------------------- */
router.use((err, req, res, next) => {
  console.error("❌ [Integrations Route Error]:", err.stack || err.message);

  return res.status(err.statusCode || 500).json({
    success: false,
    message: "Internal error in integrations module",
    details: err.message || "Unexpected error occurred",
  });
});

export default router;
