import Razorpay from "razorpay";
import { supabase } from "../config/supabaseClient.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/*
========================================
CREATE ORDER
========================================
*/
export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert INR to paise
      currency: "INR",
    });

    return res.status(200).json(order);
  } catch (error) {
    console.error("Create Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

/*
========================================
VERIFY PAYMENT
========================================
*/
export const verifyPayment = async (req, res) => {
  try {
    const user_id = req.user.id;

    const expires_at = new Date();
    expires_at.setMonth(expires_at.getMonth() + 1);

    const { error } = await supabase
      .from("user_subscriptions")
      .upsert(
        [
          {
            user_id,
            plan: "pro",
            expires_at: expires_at.toISOString(),
          },
        ],
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      plan: "pro",
      expires_at,
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
};

/*
========================================
GET SUBSCRIPTION STATUS
========================================
*/
export const getSubscription = async (req, res) => {
  try {
    const user_id = req.user.id;

    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return res.status(200).json(
      data || {
        plan: "free",
        expires_at: null,
      }
    );
  } catch (error) {
    console.error("Get Subscription Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription",
      error: error.message,
    });
  }
};