import express from "express";
import { handleWhatsappWebhook } from "../../controllers/whatsappController.js";

const router = express.Router();

router.get("/", handleWhatsappWebhook);   // Verification
router.post("/", handleWhatsappWebhook);  // Incoming messages

export default router;
