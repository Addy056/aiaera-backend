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
 * ✅ GET /api/webhook/meta
 * Meta Verification Challenge (Unified Token)
 */
router.get(
  ["/meta", "/meta-webhook"],
  asyncHandler(async (req, res) => {
    return verifyMetaWebhook(req, res);
  })
);

/**
 * ✅ POST /api/webhook/meta
 * Handles:
 *   - WhatsApp messages
 *   - Facebook Messenger events
 *   - Instagram DM events
 *   - Delivery & status updates
 *
 * ⚠️ MUST return 200 OK immediately to stop Meta retries
 */
router.post(
  ["/meta", "/meta-webhook"],
  asyncHandler(async (req, res) => {
    // ✅ Immediately acknowledge Meta
    res.sendStatus(200);

    // ✅ Process webhook asynchronously
    await handleMetaWebhook(req.body);
  })
);

/* ------------------------------------------------------
   CATCH-ALL (Invalid subroutes)
------------------------------------------------------ */
router.all("*", (req, res) => {
  console.warn(`⚠️ Invalid webhook route accessed: ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    error: "Invalid webhook route",
  });
});

/* ------------------------------------------------------
   GLOBAL ERROR HANDLER (Webhook safe)
------------------------------------------------------ */
router.use((err, req, res, next) => {
  console.error("❌ Webhook Route Error:", err.message);

  // ⚠️ Never expose stack traces to Meta
  res.status(500).json({
    success: false,
    error: "Internal server error in webhook route",
  });
});

export default router;
