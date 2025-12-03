import express from "express";
import {
  handleInstagramVerification,
  handleInstagramMessage,
} from "../../controllers/instagramController.js";

const router = express.Router();

/**
 * ✅ Instagram Webhook Routes
 * GET  → Verification Challenge
 * POST → Incoming Instagram DM events
 */

// -----------------------------
// ✅ WEBHOOK VERIFICATION
// -----------------------------
router.get("/", (req, res) => {
  try {
    return handleInstagramVerification(req, res);
  } catch (err) {
    console.error("❌ Instagram webhook verification error:", err);
    return res.sendStatus(500);
  }
});

// -----------------------------
// ✅ INCOMING MESSAGES
// -----------------------------
router.post("/", async (req, res) => {
  try {
    // ⚠️ Meta requires immediate 200 OK
    res.sendStatus(200);

    await handleInstagramMessage(req.body);
  } catch (err) {
    console.error("❌ Instagram webhook POST error:", err);
  }
});

export default router;
