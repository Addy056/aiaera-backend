import express from "express";
import { handleFacebookWebhook } from "../../controllers/facebookController.js";

const router = express.Router();
router.get("/", handleFacebookWebhook);
router.post("/", handleFacebookWebhook);

export default router;
