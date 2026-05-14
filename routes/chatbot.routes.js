import express from "express";

import {
  chatWithBot,
  createChatbot,
  getChatbotConfig,
  scrapeWebsiteTraining,
  updateChatbot,
  deleteChatbot,
  getUserChatbots,
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
These routes are accessible
without authentication.
========================================
*/

/*
========================================
PUBLIC CHAT ENDPOINT
========================================

Used By:
1. Builder Preview
2. Public Chatbot Page
3. Website Widget
4. WhatsApp Automation
5. Facebook Automation
6. Instagram Automation

Supports:
- AI conversations
- lead collection
- appointment booking
- maps/location sharing
- generic meeting providers

No auth required because
website visitors must access
the chatbot publicly.
========================================
*/
router.post(
  "/chat",
  chatWithBot
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

        publicChat:
          "POST /api/chatbot/chat",

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

export default router;