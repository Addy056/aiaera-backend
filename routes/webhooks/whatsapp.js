// backend/routes/meta/whatsapp.js
import express from "express";
import { handleWhatsappWebhook } from "../../controllers/whatsappController.js";

const router = express.Router();

/**
 * WhatsApp Webhook:
 * - GET → Only verification challenge
 * - POST → Incoming WhatsApp messages
 */

// GET: Verification Challenge
router.get("/", (req, res) => {
  return handleWhatsappWebhook(req, res); 
});

// POST: Incoming WhatsApp messages
router.post("/", async (req, res) => {
  try {
    await handleWhatsappWebhook(req, res);
  } catch (err) {
    console.error("❌ WhatsApp route POST error:", err);
    return res.sendStatus(500);
  }
});

export default router;
