import express from "express";

import {
  verifyWebhook,
  receiveWebhook,
} from "../controllers/whatsapp.controller.js";

const router =
  express.Router();

/*
========================================
HEALTH CHECK
========================================
*/
router.get(
  "/",
  (req, res) => {

    return res.status(200).json({
      success: true,

      message:
        "WhatsApp routes working 🚀",
    });
  }
);

/*
========================================
META WEBHOOK VERIFICATION
========================================
IMPORTANT:
Used by Meta during setup
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
IMPORTANT:
Receives incoming WhatsApp messages
========================================
*/
router.post(
  "/webhook",
  receiveWebhook
);

/*
========================================
INVALID WEBHOOK METHOD
========================================
*/
router.all(
  "/webhook",
  (req, res) => {

    return res.status(405).json({
      success: false,

      error:
        "Method not allowed",
    });
  }
);

export default router;