// backend/routes/integrations.js
import express from "express";
import {
  verifyMetaWebhook,
  handleMetaWebhook,
  handleCalendlyWebhook,
  saveIntegrations,
  getIntegrations,
} from "../controllers/integrationsController.js";

const router = express.Router();

/**
 * ------------------------------------------------------
 * Utility wrapper for async routes to avoid repetitive try/catch
 * ------------------------------------------------------
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * ------------------------------------------------------
 * 1. META WEBHOOKS (WhatsApp + Messenger + Instagram)
 * ------------------------------------------------------
 */

// ✅ GET /api/integrations/meta-webhook → Verify webhook
router.get("/meta-webhook", asyncHandler(verifyMetaWebhook));

// ✅ POST /api/integrations/meta-webhook → Handle incoming messages
router.post("/meta-webhook", asyncHandler(handleMetaWebhook));

/**
 * ------------------------------------------------------
 * 2. CALENDLY WEBHOOK
 * ------------------------------------------------------
 */

// ✅ POST /api/integrations/calendly-webhook → Handle new appointments
router.post("/calendly-webhook", asyncHandler(handleCalendlyWebhook));

/**
 * ------------------------------------------------------
 * 3. USER INTEGRATIONS (Supabase storage)
 * ------------------------------------------------------
 */

// ✅ GET /api/integrations?user_id=...
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, error: "Missing user_id in query params" });
    }

    // Use controller function directly
    await getIntegrations(req, res);
  })
);

// ✅ POST /api/integrations → Save or update user integrations
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, error: "Missing user_id in request body" });
    }

    // Use controller function directly
    await saveIntegrations(req, res);
  })
);

/**
 * ------------------------------------------------------
 * 4. Global Error Handling for Integrations Routes
 * ------------------------------------------------------
 */
router.use((err, req, res, next) => {
  console.error("❌ Integrations route error:", err.stack || err.message);

  res.status(err.status || 500).json({
    success: false,
    error: "Internal server error in integrations route",
    message: err.message || "Unexpected error",
  });
});

export default router;
