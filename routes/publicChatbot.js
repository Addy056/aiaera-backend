// backend/routes/publicChatbot.js
import express from 'express';
import {
  getPublicChatbot,
  sendPublicMessage
} from '../controllers/publicChatbotController.js';

const router = express.Router();

// Public routes for chatbot iframe
router.get('/:id', getPublicChatbot);
router.post('/:id/message', sendPublicMessage);

export default router;
