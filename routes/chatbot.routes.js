import express from "express";

import {
  chatWithBot,
  createChatbot,
  getChatbotConfig,
  scrapeWebsiteTraining,
  updateChatbot,
  deleteChatbot,
  getUserChatbots,
  getPublicChatbot,
} from "../controllers/chatbot.controller.js";

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
PUBLIC CHAT
========================================
Used by:
1. Website Widget
2. Public Chatbot Page
3. Builder Preview
4. WhatsApp Automation
5. Facebook Automation
6. Instagram Automation
========================================
*/
router.post(
  "/chat",
  chatWithBot
);

/*
========================================
PUBLIC CHATBOT CONFIG
========================================
Used by:
- Public chatbot page
- Embed widget
========================================
*/
router.get(
  "/public/:id",
  getPublicChatbot
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
        "Chatbot routes working ✅",

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
        publicChat:
          "POST /api/chatbot/chat",

        publicConfig:
          "GET /api/chatbot/public/:id",

        /*
        ====================================
        PROTECTED
        ====================================
        */
        create:
          "POST /api/chatbot/create",

        getAll:
          "GET /api/chatbot/user/all",

        getSingle:
          "GET /api/chatbot/:id",

        update:
          "PUT /api/chatbot/:id",

        delete:
          "DELETE /api/chatbot/:id",

        scrape:
          "POST /api/chatbot/scrape",
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
CREATE CHATBOT
========================================
*/
router.post(
  "/create",
  authMiddleware,
  checkSubscription,
  createChatbot
);

/*
========================================
GET USER CHATBOTS
========================================
*/
router.get(
  "/user/all",
  authMiddleware,
  checkSubscription,
  getUserChatbots
);

/*
========================================
GET SINGLE CHATBOT
========================================
*/
router.get(
  "/:id",
  authMiddleware,
  checkSubscription,
  getChatbotConfig
);

/*
========================================
UPDATE CHATBOT
========================================
*/
router.put(
  "/:id",
  authMiddleware,
  checkSubscription,
  updateChatbot
);

/*
========================================
DELETE CHATBOT
========================================
*/
router.delete(
  "/:id",
  authMiddleware,
  checkSubscription,
  deleteChatbot
);

/*
========================================
WEBSITE SCRAPING
========================================
Used for:
- website training
- AI knowledge generation
========================================
*/
router.post(
  "/scrape",
  authMiddleware,
  checkSubscription,
  scrapeWebsiteTraining
);

export default router;