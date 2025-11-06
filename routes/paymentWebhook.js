// backend/routes/paymentWebhook.js
import express from 'express';
import crypto from 'crypto';
import supabase from '../config/supabaseClient.js';

const router = express.Router();
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

// Helper to verify Razorpay webhook signature
function verifySignature(rawBody, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expectedSignature === signature;
}

// Raw body middleware to capture exact buffer
router.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

router.post('/', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  if (!signature || !verifySignature(req.rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  try {
    if (event.event === 'subscription.charged') {
      const subscriptionId = event.payload.subscription.entity.id;
      const paymentId = event.payload.payment.entity.id;
      const paidAt = new Date(event.payload.payment.entity.created * 1000);
      const userId = event.payload.subscription.entity.notes?.user_id;

      if (!userId) {
        console.error('Webhook missing user_id in notes:', event);
        return res.status(400).json({ error: 'Missing user_id in notes' });
      }

      // Extend expiry by 1 month
      const expiresAt = new Date(paidAt);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { error } = await supabase
        .from('user_subscriptions')
        .upsert(
          {
            user_id: userId,
            subscription_id: subscriptionId,
            payment_id: paymentId,
            expires_at: expiresAt.toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Supabase update error:', error);
        return res.status(500).json({ error: 'Failed to update subscription' });
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
