// backend/routes/chatbot.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createChatbot,
  getUserChatbots,
  updateChatbot,
  publicChatbot,
  previewChat,
  getPublicChatbotConfig,
} from "../controllers/chatbotController.js";

const router = express.Router();

// Helper to wrap async functions
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* -------------------------------
   PUBLIC: GET CHATBOT CONFIG
   GET /api/chatbot/config/:id
--------------------------------*/
router.get(
  "/config/:id",
  asyncHandler(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    return getPublicChatbotConfig(req, res);
  })
);

/* -------------------------------
   PUBLIC: CHATBOT MESSAGE
   POST /api/chatbot/public/:id
--------------------------------*/
router.post(
  "/public/:id",
  asyncHandler(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    return publicChatbot(req, res);
  })
);

/* -------------------------------
   BUILDER PREVIEW (AUTH OPTIONAL)
   POST /api/chatbot/preview
--------------------------------*/
router.post(
  "/preview",
  asyncHandler(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    return previewChat(req, res);
  })
);

/* -------------------------------
   PROTECTED ROUTES
--------------------------------*/
router.use(requireAuth);

router.post("/", asyncHandler(createChatbot));
router.get("/", asyncHandler(getUserChatbots));
router.put("/:id", asyncHandler(updateChatbot));

export default router;
