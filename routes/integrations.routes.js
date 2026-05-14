import express from "express";

import {
  saveIntegration,
  getIntegration,
  getPublicIntegrations,
  toggleAutomation,
  testConnection,
} from "../controllers/integrations.controller.js";

import {
  authMiddleware,
} from "../middleware/auth.js";

const router =
  express.Router();

/*
========================================
PUBLIC INTEGRATIONS
USED BY EMBED CHATBOT
========================================
*/
router.get(
  "/public/:chatbotId",
  getPublicIntegrations
);

/*
========================================
USER INTEGRATIONS
(PROTECTED)
========================================
*/

/*
========================================
SAVE INTEGRATIONS
========================================
*/
router.post(
  "/",
  authMiddleware,
  saveIntegration
);

/*
========================================
GET INTEGRATIONS
========================================
*/
router.get(
  "/",
  authMiddleware,
  getIntegration
);

/*
========================================
TOGGLE AUTOMATION
========================================
*/
router.patch(
  "/toggle",
  authMiddleware,
  toggleAutomation
);

/*
========================================
TEST CONNECTION
========================================
*/
router.post(
  "/test",
  authMiddleware,
  testConnection
);

/*
========================================
HEALTH CHECK
========================================
*/
router.get(
  "/test-route",
  (req, res) => {

    return res.json({
      success: true,

      message:
        "Integrations route working ✅",
    });
  }
);

export default router;