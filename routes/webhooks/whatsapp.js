import express from "express";
import {
  handleWhatsappVerification,
  handleWhatsappMessage,
} from "../../controllers/whatsappController.js";

const router = express.Router();

/**
 * ✅ WhatsApp Webhook Routes
 * GET  → Verification Challenge
 * POST → Incoming WhatsApp messages
 */

// -----------------------------
// ✅ WEBHOOK VERIFICATION
// -----------------------------
router.get("/", (req, res) => {
  try {
    return handleWhatsappVerification(req, res);
  } catch (err) {
    console.error("❌ WhatsApp webhook verification error:", err);
    return res.sendStatus(500);
  }
});

// -----------------------------
// ✅ INCOMING MESSAGES
// -----------------------------
router.post("/", async (req, res) => {
  try {
    // ⚠️ Meta requires an immediate 200 OK or it retries
    res.sendStatus(200);

    await handleWhatsappMessage(req.body);
  } catch (err) {
    console.error("❌ WhatsApp webhook POST error:", err);
  }
});

export default router;
