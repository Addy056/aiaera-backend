// backend/routes/user.js
import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Example protected route
router.get('/profile', requireAuth, (req, res) => {
  res.json({
    message: 'You are authorized!',
    user: req.user
  });
});

export default router;
