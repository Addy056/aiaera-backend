// backend/routes/meta/facebook.js
import express from "express";
import { handleFacebookWebhook } from "../../controllers/facebookController.js";

const router = express.Router();

/**
 * Facebook Webhook:
 * - GET → Verify Token
 * - POST → Handle messages
 */

router.get("/", (req, res) => {
  // Verification MUST be handled separately
  return handleFacebookWebhook(req, res);
});

router.post("/", async (req, res) => {
  // Meta requires immediate response or it retries
  try {
    await handleFacebookWebhook(req, res);
  } catch (err) {
    console.error("❌ Facebook POST route error:", err);
    return res.sendStatus(500);
  }
});

export default router;
