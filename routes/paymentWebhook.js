// backend/routes/paymentWebhook.js
import express from "express";
import crypto from "crypto";
import supabase from "../config/supabaseClient.js";

const router = express.Router();
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

// Verify Razorpay signature
function verifySignature(rawBody, signature) {
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return expectedSignature === signature;
}

// Capture raw request body
router.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

router.post("/", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  if (!signature || !verifySignature(req.rawBody, signature)) {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const event = req.body;
  console.log("📦 Razorpay Webhook Event:", event.event);

  try {
    // Handle standard payment capture events
    if (["payment.captured", "order.paid"].includes(event.event)) {
      const payment = event.payload?.payment?.entity;
      const userId = payment?.notes?.user_id;
      const plan = payment?.notes?.plan || "basic";

      if (!userId) {
        console.error("❌ Webhook missing user_id in notes:", event);
        return res.status(400).json({ error: "Missing user_id in notes" });
      }

      const paidAt = new Date(payment.created_at * 1000);
      const expiresAt = new Date(paidAt);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { error } = await supabase
        .from("user_subscriptions")
        .upsert(
          {
            user_id: userId,
            plan,
            payment_id: payment.id,
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("❌ Supabase update error:", error);
        return res.status(500).json({ error: "Failed to update subscription" });
      }

      console.log(`✅ Subscription auto-renewed for ${userId} (${plan})`);
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
