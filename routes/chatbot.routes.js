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

import { authMiddleware } from "../middleware/auth.js";

import { checkSubscription } from "../middleware/subscription.js";

const router = express.Router();

/*
========================================
🔐 PROTECTED ROUTES
========================================
All dashboard routes
require authentication
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
GET ALL USER CHATBOTS
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
*/
router.post(
  "/scrape",
  authMiddleware,
  checkSubscription,
  scrapeWebsiteTraining
);

/*
========================================
🤖 PUBLIC CHAT ENDPOINT
========================================

Used By:
1. Builder Preview
2. Website Widget
3. WhatsApp Auto Reply
4. Facebook Messenger
5. Instagram Auto Reply

No auth middleware here
because website visitors
must access chatbot publicly.
========================================
*/
router.post(
  "/chat",
  chatWithBot
);

export default router;