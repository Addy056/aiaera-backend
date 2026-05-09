import Razorpay from "razorpay";
import { supabase } from "../config/supabaseClient.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// CREATE ORDER
export const createOrder = async (req, res) => {
  const { amount } = req.body;

  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR"
  });

  res.json(order);
};

// VERIFY PAYMENT
export const verifyPayment = async (req, res) => {
const userId = req.user.id;
  // Simplified (real verification later)
  const expires_at = new Date();
  expires_at.setMonth(expires_at.getMonth() + 1);

  await supabase.from("user_subscriptions").upsert([
    {
      user_id,
      plan: "pro",
      expires_at
    }
  ]);

  res.json({ success: true });
};

// GET STATUS
export const getSubscription = async (req, res) => {
  const user_id = req.user.id;

  const { data } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user_id)
    .single();

  res.json(data);
};