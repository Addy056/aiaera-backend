// backend/controllers/authController.js
import supabase from "../config/supabaseClient.js";

/**
 * Signup controller - registers a new user via Admin API (Service Role key)
 */
export async function signup(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // Basic password policy (example: min 8 chars)
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters long." });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      // For production, set this to false to enforce email confirmation
      email_confirm: false,
    });

    if (error) {
      console.error("Supabase signup error:", error.message);
      return res.status(400).json({
        error: "Unable to register user. Please try again later.",
      });
    }

    return res.status(201).json({
      message: "User registered successfully. Please confirm your email to continue.",
      userId: data.user?.id,
      email: data.user?.email,
    });
  } catch (err) {
    console.error("Signup exception:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Login controller
 * 🔐 Logins should always be handled on the frontend with Supabase client.
 */
export async function login(req, res) {
  return res.status(400).json({
    error:
      "Login must be performed from the frontend using Supabase client. Backend login is disabled for security.",
  });
}
