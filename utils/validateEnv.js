// backend/utils/validateEnv.js

/**
 * Validate required environment variables before starting the server.
 * Exits the process if any required variable is missing.
 */
export const validateEnv = () => {
  // 🔐 Required environment variables for AIAERA backend
  const requiredVars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GROQ_API_KEY",
    "JWT_SECRET",
    "JWT_EXPIRES_IN",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
  ];

  // 🔍 Check for missing fields
  const missing = requiredVars.filter(
    (key) => !process.env[key] || process.env[key].trim() === ""
  );

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   → ${key}`));
    console.error("❌ Server cannot start without these variables.");
    process.exit(1);
  }

  // ✔ All good
  console.log("✅ Environment variables validated successfully");
};
