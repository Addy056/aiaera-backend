import express from "express";
import {
  verifyMetaWebhook,
  handleMetaWebhook,
  handleCalendlyWebhook,
  saveIntegrations,
  getIntegrations,
} from "../controllers/integrationsController.js";

const router = express.Router();

/* -----------------------------------------------------
 * META (WhatsApp / FB / IG) webhooks
 * Keep both legacy and clean paths for compatibility
 * ----------------------------------------------------- */
router.get("/meta-webhook", verifyMetaWebhook);
router.post("/meta-webhook", handleMetaWebhook);
router.get("/meta", verifyMetaWebhook);
router.post("/meta", handleMetaWebhook);

/* -----------------------------------------------------
 * CALENDLY webhooks
 * Legacy + clean paths
 * ----------------------------------------------------- */
router.post("/calendly-webhook", handleCalendlyWebhook);
router.post("/calendly", handleCalendlyWebhook);

/* -----------------------------------------------------
 * INTEGRATIONS CRUD
 * ----------------------------------------------------- */

// Save / update (upsert)
router.post("/", saveIntegrations);

// Get by user_id
router.get("/", getIntegrations);

/* -----------------------------------------------------
 * Error handler for this router
 * ----------------------------------------------------- */
router.use((err, req, res, next) => {
  console.error("Integrations route error:", err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: "Internal server error in integrations route",
    message: err.message || "Unexpected error",
  });
});

export default router;
