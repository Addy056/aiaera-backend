import express from "express";
import { handleFacebookVerification, handleFacebookMessage } from "../../controllers/facebookController.js";

const router = express.Router();

/**
 * ✅ Facebook Webhook Routes
 * GET  → Verification
 * POST → Incoming messages / events
 */

// -----------------------------
// ✅ WEBHOOK VERIFICATION
// -----------------------------
router.get("/", (req, res) => {
  try {
    return handleFacebookVerification(req, res);
  } catch (err) {
    console.error("❌ Facebook webhook verification error:", err);
    return res.sendStatus(500);
  }
});

// -----------------------------
// ✅ INCOMING MESSAGES
// -----------------------------
router.post("/", async (req, res) => {
  try {
    // ⚠️ Meta requires 200 OK immediately
    res.sendStatus(200);

    await handleFacebookMessage(req.body);
  } catch (err) {
    console.error("❌ Facebook webhook POST error:", err);
  }
});

export default router;
