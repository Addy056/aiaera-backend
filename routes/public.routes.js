import express from "express";

import {
  getPublicChatbot,
} from "../controllers/public.controller.js";

const router = express.Router();

/*
========================================
PUBLIC ROUTES
========================================
These routes are accessible
without authentication.

Used by:
- Website widget
- Public chatbot page
- External integrations
========================================
*/

/*
========================================
GET PUBLIC CHATBOT
========================================
*/
router.get(
  "/chatbot/:id",
  getPublicChatbot
);

export default router;