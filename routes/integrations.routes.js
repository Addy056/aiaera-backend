import express from "express";

import {
  saveIntegration,
  getIntegration,
  getPublicIntegrations,
  toggleAutomation,
  testConnection,
} from "../controllers/integration.controller.js";

import {
  authMiddleware,
} from "../middleware/auth.js";

const router =
  express.Router();

/*
========================================
PUBLIC INTEGRATIONS
USED BY PUBLIC CHATBOT
========================================
Returns:
- provider
- meeting_link
- maps
========================================
*/
router.get(
  "/public/:chatbotId",
  getPublicIntegrations
);

/*
========================================
PROTECTED ROUTES
========================================
Requires Auth
========================================
*/

/*
========================================
SAVE USER INTEGRATIONS
========================================
Supports:
- WhatsApp
- Facebook
- Instagram
- Calendly
- Zoom
- Teams
- Google Meet
- Custom booking links
========================================
*/
router.post(
  "/",
  authMiddleware,
  saveIntegration
);

/*
========================================
GET USER INTEGRATIONS
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
Platforms:
- whatsapp
- facebook
- instagram
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
  "/health",
  (req, res) => {

    return res.status(200).json({

      success: true,

      message:
        "Integrations API working ✅",
    });
  }
);

/*
========================================
DEBUG ROUTE
========================================
*/
router.get(
  "/debug",
  (req, res) => {

    return res.status(200).json({

      success: true,

      routes: {

        public:
          "/api/integrations/public/:chatbotId",

        save:
          "POST /api/integrations",

        get:
          "GET /api/integrations",

        toggle:
          "PATCH /api/integrations/toggle",

        test:
          "POST /api/integrations/test",
      },
    });
  }
);

export default router;