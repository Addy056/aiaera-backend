import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_BUCKET,
  NODE_ENV,
} = process.env;

// ----------------------
// Validate environment variables
// ----------------------
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables."
  );
}

// ----------------------
// Backend Supabase client
// ⚠️ Uses Service Role Key — do NOT expose to frontend
// ----------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false, // backend is stateless
    persistSession: false,
  },
  global: {
    headers: {
      "X-Client-Name": "AIAERA-Backend",
    },
  },
  // Optional: set fetch timeout & retry policy for production
  fetch: async (url, options) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (err) {
      console.error("[Supabase Fetch Error]", err);
      throw err;
    }
  },
});

// ----------------------
// Default storage bucket
// ----------------------
export const BUCKET = SUPABASE_BUCKET || "chatbot-files";

// ----------------------
// Log initialization in non-production
// ----------------------
if (NODE_ENV !== "production") {
  console.log(
    "[Supabase] Backend client initialized successfully with Service Role Key."
  );
}

export default supabase;
