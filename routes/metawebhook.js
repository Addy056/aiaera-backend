// backend/routes/webhook.js
import express from "express";
import {
  verifyMetaWebhook,
  handleMetaWebhook,
} from "../controllers/webhookController.js";

const router = express.Router();

/* ------------------------------------------------------
   Async wrapper to simplify error handling
------------------------------------------------------ */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------------------------------------
   META WEBHOOK ROUTES (FB / IG / WhatsApp)
------------------------------------------------------ */

/**
 * GET /api/webhook/meta
 * Used by Meta (Facebook/Instagram/WhatsApp) for verification challenge.
 */
router.get(
  ["/meta", "/meta-webhook"],
  asyncHandler(async (req, res) => {
    return verifyMetaWebhook(req, res);
  })
);

/**
 * POST /api/webhook/meta
 * Handles:
 *   - WhatsApp messages
 *   - Facebook Messenger webhook events
 *   - Instagram DM webhook events
 *   - WhatsApp delivery/status updates
 */
router.post(
  ["/meta", "/meta-webhook"],
  asyncHandler(async (req, res) => {
    return handleMetaWebhook(req, res);
  })
);

/* ------------------------------------------------------
   CATCH-ALL (for invalid subroutes)
------------------------------------------------------ */
router.all("*", (req, res) => {
  console.warn(`⚠️ Invalid webhook route accessed: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "Invalid webhook route",
  });
});

/* ------------------------------------------------------
   GLOBAL ERROR HANDLER (safe for webhook routes)
------------------------------------------------------ */
router.use((err, req, res, next) => {
  console.error("❌ Webhook Route Error:", err.message);

  res.status(500).json({
    success: false,
    error: "Internal server error in webhook route",
  });
});

export default router;
