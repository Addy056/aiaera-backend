import express from "express";

import {
  getEmbedScript,
  getPublicChatbot,
} from "../controllers/embed.controller.js";

const router = express.Router();

/*
========================================
PUBLIC CHATBOT CONFIG
========================================
Used by:
- Website Widget
- Public Chatbot Page
- External Integrations
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

export default router;