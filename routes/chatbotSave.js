// backend/routes/chatbotSave.js
import express from "express";
import { saveChatbotConfig } from "../controllers/chatbotSaveController.js";

const router = express.Router();

// ✅ Save or update chatbot configuration
router.post("/save", saveChatbotConfig);

export default router;
