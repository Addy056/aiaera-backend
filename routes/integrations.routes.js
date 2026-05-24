import express from "express";

import {

  saveIntegration,

  getIntegration,

  getPublicIntegrations,

  toggleAutomation,

  testConnection,

  deleteIntegration,

  getAutomationStatus,

} from "../controllers/integrations.controller.js";

import {
  authMiddleware,
} from "../middleware/auth.js";

import {
  checkSubscription,
} from "../middleware/subscription.js";

const router =
  express.Router();

/*
========================================
PUBLIC ROUTES
========================================
Accessible without auth
========================================
*/

/*
========================================
PUBLIC INTEGRATIONS
========================================
Used By:
- Public chatbot
- Website widget
- Booking buttons
- Maps/location sharing

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

      timestamp:
        new Date(),
    });
  }
);

/*
========================================
DEBUG ROUTES
========================================
*/
router.get(
  "/debug/routes",
  (req, res) => {

    return res.status(200).json({

      success: true,

      routes: {

        /*
        ====================================
        PUBLIC
        ====================================
        */
        public:
          "GET /api/integrations/public/:chatbotId",

        /*
        ====================================
        PROTECTED
        ====================================
        */
        save:
          "POST /api/integrations",

        get:
          "GET /api/integrations",

        toggle:
          "PATCH /api/integrations/toggle",

        test:
          "POST /api/integrations/test",

        delete:
          "DELETE /api/integrations/:platform",

        status:
          "GET /api/integrations/status",
      },
    });
  }
);

/*
========================================
PROTECTED ROUTES
========================================
Requires:
- Authentication
- Active subscription
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
  checkSubscription,
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
  checkSubscription,
  toggleAutomation
);

/*
========================================
AUTOMATION STATUS
========================================
Returns:
- whatsapp enabled
- facebook enabled
- instagram enabled
========================================
*/
router.get(
  "/status",
  authMiddleware,
  getAutomationStatus
);

/*
========================================
TEST CONNECTION
========================================
*/
router.post(
  "/test",
  authMiddleware,
  checkSubscription,
  testConnection
);

/*
========================================
DELETE INTEGRATION
========================================
*/
router.delete(
  "/:platform",
  authMiddleware,
  checkSubscription,
  deleteIntegration
);

export default router;