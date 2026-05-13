import express from "express";

import {
  getPublicChatbot,
} from "../controllers/public.controller.js";

const router =
  express.Router();

/*
========================================
HEALTH CHECK
========================================
Used to verify public routes
========================================
*/
router.get(
  "/health",
  (req, res) => {

    return res.status(200).json({
      success: true,
      message:
        "Public routes working",
    });
  }
);

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
GET /api/public/chatbot/:id
========================================
*/
router.get(
  "/chatbot/:id",
  getPublicChatbot
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
        "Public route not found",
    });
  }
);

export default router;