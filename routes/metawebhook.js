// backend/routes/webhook.js
import express from "express";
import {
  verifyMetaWebhook,
  handleMetaWebhook,
} from "../controllers/webhookController.js";

const router = express.Router();

/**
 * ------------------------------------------------------
 * Meta Webhook Routes
 * ------------------------------------------------------
 */

// GET /api/webhook/meta
// Used by Meta (Facebook/WhatsApp) for webhook verification
router.get("/meta", async (req, res, next) => {
  try {
    await verifyMetaWebhook(req, res);
  } catch (err) {
    console.error("❌ Error in GET /webhook/meta:", err.stack || err.message);
    next(err);
  }
});

// POST /api/webhook/meta
// Handles incoming Meta webhook events (messages, status updates, etc.)
router.post("/meta", async (req, res, next) => {
  try {
    await handleMetaWebhook(req, res);
  } catch (err) {
    console.error("❌ Error in POST /webhook/meta:", err.stack || err.message);
    next(err);
  }
});

/**
 * ------------------------------------------------------
 * Global Error Handling for Webhook Routes
 * ------------------------------------------------------
 */
router.use((err, req, res, next) => {
  console.error("❌ Webhook route unhandled error:", err.stack || err.message);
  res.status(500).json({
    error: "Internal server error in webhook route",
    message: err.message || "Unexpected error",
  });
});

export default router;
