// backend/controllers/authController.js
import supabase from "../config/supabaseClient.js";

/**
 * 📌 Utility: Validate email format
 */
const isEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * SIGNUP CONTROLLER
 * Uses Supabase Admin API (SERVICE ROLE KEY required)
 */
export async function signup(req, res) {
  try {
    const { email, password } = req.body;

    // -------------------------
    // Validate Inputs
    // -------------------------
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }

    if (!isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters long"
      });
    }

    // -------------------------
    // Check if email already exists
    // -------------------------
    const { data: existingUser } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User already exists with this email"
      });
    }

    // -------------------------
    // CREATE USER
    // -------------------------
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm to avoid login issues
    });

    if (error) {
      console.error("❌ Supabase signup error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Unable to register user"
      });
    }

    const userId = data.user?.id;

    if (!userId) {
      return res.status(500).json({
        success: false,
        error: "User created but ID missing. Contact support."
      });
    }

    // -------------------------------------------------------
    // INSERT FREE PLAN INTO user_subscriptions
    // -------------------------------------------------------
    const { error: subErr } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: userId,
        plan: "free",
        expires_at: null, // free plan never expires
      });

    if (subErr) {
      console.error("❌ Subscription init error:", subErr.message);
    }

    // -------------------------------------------------------
    // CREATE EMPTY user_integrations ROW
    // -------------------------------------------------------
    const { error: integrationErr } = await supabase
      .from("user_integrations")
      .insert({
        user_id: userId,
        whatsapp_access_token: null,
        whatsapp_phone_number_id: null,
        facebook_page_id: null,
        instagram_account_id: null,
        calendly_link: null,
      });

    if (integrationErr) {
      console.error("❌ Integrations init error:", integrationErr.message);
    }

    // -------------------------
    // SUCCESS RESPONSE
    // -------------------------
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId,
      email,
    });

  } catch (err) {
    console.error("❌ Signup exception:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

/**
 * LOGIN — disabled for backend
 */
export function login(req, res) {
  return res.status(400).json({
    success: false,
    error: "Use Supabase client for login. Backend login disabled."
  });
}
