import express from "express";

import {
  verifyWebhook,
  receiveWebhook,
} from "../controllers/whatsapp.controller.js";

const router =
  express.Router();

/*
========================================
WEBHOOK VERIFICATION
========================================
*/
router.get(
  "/webhook",
  verifyWebhook
);

/*
========================================
RECEIVE WHATSAPP EVENTS
========================================
*/
router.post(
  "/webhook",
  receiveWebhook
);

export default router;