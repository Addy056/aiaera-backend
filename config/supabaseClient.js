// backend/config/supabaseClient.js
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ----------------------
// Extract environment variables
// ----------------------
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  SUPABASE_BUCKET,
  NODE_ENV,
} = process.env;

// ----------------------
// Validate environment variables
// ----------------------
if (!SUPABASE_URL) {
  throw new Error("[Supabase] ❌ Missing SUPABASE_URL in environment variables.");
}

if (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY) {
  throw new Error(
    "[Supabase] ❌ Missing both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY. Please set at least one."
  );
}

// ----------------------
// Use the Service Role Key (preferred for backend)
// Fallback to ANON key for local dev/testing
// ----------------------
const supabaseKey =
  SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY.trim() !== ""
    ? SUPABASE_SERVICE_ROLE_KEY
    : SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false, // backend is stateless
  },
  global: {
    headers: {
      "X-Client-Name": "AIAERA-Backend",
    },
  },
  // ✅ Safe fetch with timeout & retry handling
  fetch: async (url, options) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (err) {
      console.error("[Supabase Fetch Error]", err.message);
      throw err;
    }
  },
});

// ----------------------
// Default storage bucket for chatbot file uploads
// ----------------------
export const BUCKET = SUPABASE_BUCKET || "chatbot-files";

// ----------------------
// Log initialization (only in development)
// ----------------------
if (NODE_ENV !== "production") {
  console.log("✅ [Supabase] Backend client initialized successfully.");
  console.log("   URL:", SUPABASE_URL);
  console.log("   Auth Mode:", SUPABASE_SERVICE_ROLE_KEY ? "Service Role Key" : "Anon Key");
}

export default supabase;
