// backend/routes/paymentWebhook.js
import express from "express";
import crypto from "crypto";
import supabase from "../config/supabaseClient.js";

const router = express.Router();

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

/* ----------------------------------------------------
   1) Validate presence of Webhook Secret on boot
---------------------------------------------------- */
if (!WEBHOOK_SECRET) {
  console.error("❌ RAZORPAY_WEBHOOK_SECRET is missing in environment variables!");
}

/* ----------------------------------------------------
   2) Verify Razorpay Webhook Signature
---------------------------------------------------- */
function verifySignature(rawBody, signature) {
  if (!WEBHOOK_SECRET || !signature) return false;

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return expected === signature;
}

/* ----------------------------------------------------
   3) Capture RAW BODY (required for Razorpay validation)
---------------------------------------------------- */
router.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

/* ----------------------------------------------------
   4) Handle Razorpay Webhook
---------------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];

    // 🔐 Signature validation
    if (!verifySignature(req.rawBody, signature)) {
      console.warn("⚠️ Invalid Razorpay webhook signature");
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body;
    console.log(`📦 Razorpay Webhook Received: ${event.event}`);

    /* ----------------------------------------------------
       PAYMENT EVENTS: payment.captured / order.paid
    ---------------------------------------------------- */
    if (["payment.captured", "order.paid"].includes(event.event)) {
      const payment = event.payload?.payment?.entity;

      if (!payment) {
        console.error("❌ Missing payment payload", event);
        return res.status(400).json({ error: "Missing payment data" });
      }

      const userId = payment.notes?.user_id;
      const plan = payment.notes?.plan || "basic";

      if (!userId) {
        console.error("❌ user_id missing in Razorpay notes", payment);
        return res.status(400).json({ error: "Missing user_id in payment notes" });
      }

      // Razorpay timestamp in seconds → convert to ms
      const paidAt = new Date(payment.created_at * 1000);
      const expiresAt = new Date(paidAt);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      console.log(
        `🔄 Auto-renewing subscription → User: ${userId}, Plan: ${plan}, Expires: ${expiresAt}`
      );

      // Save subscription
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
        console.error("❌ Supabase subscription update failed:", error.message);
        return res.status(500).json({ error: "Failed to update subscription" });
      }

      console.log(`✅ Subscription renewed for user ${userId}`);
    }

    /* ----------------------------------------------------
       Respond fast so Razorpay does not retry
    ---------------------------------------------------- */
    return res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Razorpay webhook processing error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
