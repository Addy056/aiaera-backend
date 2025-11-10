import express from "express";
import { handleInstagramWebhook } from "../../controllers/instagramController.js";

const router = express.Router();
router.get("/", handleInstagramWebhook);
router.post("/", handleInstagramWebhook);

export default router;
