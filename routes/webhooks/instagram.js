// backend/routes/meta/instagram.js
import express from "express";
import { handleInstagramWebhook } from "../../controllers/instagramController.js";

const router = express.Router();

/**
 * Instagram Webhook:
 * - GET → Verification Challenge
 * - POST → Handle incoming Instagram DM events
 */

router.get("/", (req, res) => {
  // MUST handle only verification
  return handleInstagramWebhook(req, res);
});

router.post("/", async (req, res) => {
  try {
    // Meta requires immediate 200 OK to stop retries
    await handleInstagramWebhook(req, res);
  } catch (err) {
    console.error("❌ Instagram POST route error:", err);
    return res.sendStatus(500);
  }
});

export default router;
