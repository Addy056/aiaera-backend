// backend/config/supabaseClient.js
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ----------------------
// ✅ Extract environment variables
// ----------------------
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  NODE_ENV,
} = process.env;

if (!SUPABASE_URL) {
  throw new Error("[Supabase] ❌ Missing SUPABASE_URL in environment variables.");
}

if (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY) {
  throw new Error(
    "[Supabase] ❌ Missing both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY. Please set at least one."
  );
}

// ----------------------
// ✅ Prefer Service Role Key for backend (RLS bypass)
// ----------------------
const supabaseKey =
  SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY.trim() !== ""
    ? SUPABASE_SERVICE_ROLE_KEY
    : SUPABASE_ANON_KEY;

// ----------------------
// ✅ Create backend Supabase client
// ----------------------
const supabase = createClient(SUPABASE_URL, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false, // Backend = stateless
  },
  global: {
    headers: { "X-Backend-Client": "AIAERA-Backend" },
  },
  // ✅ Safe fetch: adds timeout & abort to avoid hanging requests
  fetch: async (url, options) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s safety
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
// ✅ Log info (only in dev)
// ----------------------
if (NODE_ENV !== "production") {
  console.log("✅ [Supabase] Backend client initialized");
  console.log("   → URL:", SUPABASE_URL);
  console.log("   → Auth Mode:", SUPABASE_SERVICE_ROLE_KEY ? "Service Role Key" : "Anon Key");
}

export default supabase;
