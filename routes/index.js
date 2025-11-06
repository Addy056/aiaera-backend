import express from 'express';
const router = express.Router();

// Health check API
router.get('/health', (req, res) => {
  res.json({ status: 'API is healthy!' });
});

export default router;
