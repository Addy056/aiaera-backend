import express from "express";

import {

  /*
  ========================================
  WHATSAPP
  ========================================
  */
  verifyWhatsAppWebhook,
  handleWhatsAppWebhook,

  /*
  ========================================
  FACEBOOK
  ========================================
  */
  verifyFacebookWebhook,
  handleFacebookWebhook,

  /*
  ========================================
  INSTAGRAM
  ========================================
  */
  verifyInstagramWebhook,
  handleInstagramWebhook,

} from "../controllers/webhook.controller.js";

const router =
  express.Router();

/*
========================================
WHATSAPP WEBHOOK
========================================
*/

// Verification
router.get(
  "/whatsapp",
  verifyWhatsAppWebhook
);

// Events
router.post(
  "/whatsapp",
  handleWhatsAppWebhook
);

/*
========================================
FACEBOOK WEBHOOK
========================================
*/

// Verification
router.get(
  "/facebook",
  verifyFacebookWebhook
);

// Events
router.post(
  "/facebook",
  handleFacebookWebhook
);

/*
========================================
INSTAGRAM WEBHOOK
========================================
*/

// Verification
router.get(
  "/instagram",
  verifyInstagramWebhook
);

// Events
router.post(
  "/instagram",
  handleInstagramWebhook
);

/*
========================================
WEBHOOK HEALTH CHECK
========================================
*/
router.get(
  "/test",
  (req, res) => {

    return res.status(200).json({
      success: true,

      message:
        "Webhook routes working 🚀",
    });
  }
);

export default router;