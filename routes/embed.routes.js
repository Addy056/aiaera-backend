import express from "express";

import {
  getEmbedScript,
  getPublicChatbot,
} from "../controllers/embed.controller.js";

const router =
  express.Router();

/*
========================================
HEALTH CHECK
========================================
Used for testing routes
========================================
*/
router.get(
  "/health",
  (req, res) => {

    return res.status(200).json({
      success: true,
      message:
        "Embed routes working",
    });
  }
);

/*
========================================
PUBLIC CHATBOT CONFIG
========================================
Used by:
- Website Widget
- Public Chatbot Page
- External Integrations

Example:
GET /api/embed/chatbot/:id
========================================
*/
router.get(
  "/chatbot/:id",
  getPublicChatbot
);

/*
========================================
EMBED SCRIPT
========================================
Example:
<script src="YOUR_BACKEND/api/embed/CHATBOT_ID.js"></script>

Injects floating AI widget
into client website
========================================
*/
router.get(
  "/:id.js",
  getEmbedScript
);

/*
========================================
INVALID ROUTES
========================================
*/
router.use(
  "*",
  (req, res) => {

    return res.status(404).json({
      success: false,
      error:
        "Embed route not found",
    });
  }
);

export default router;