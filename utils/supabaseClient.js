// backend/config/supabaseClient.js
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ----------------------
// 🔧 Extract Environment Variables
// ----------------------
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  NODE_ENV,
} = process.env;

if (!SUPABASE_URL) {
  throw new Error("❌ [Supabase] Missing SUPABASE_URL");
}

if (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY) {
  throw new Error(
    "❌ [Supabase] Missing all Supabase keys. Provide SERVICE_ROLE_KEY or ANON_KEY."
  );
}

// ----------------------
// 🔐 Prefer Service Role Key for backend (bypasses RLS, required for webhooks)
// ----------------------
const supabaseKey =
  SUPABASE_SERVICE_ROLE_KEY?.trim() !== ""
    ? SUPABASE_SERVICE_ROLE_KEY
    : SUPABASE_ANON_KEY;

// ----------------------
// 🚀 Create Supabase Client
// ----------------------
const supabase = createClient(SUPABASE_URL, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: { "X-Backend": "AIAERA-Backend" },
  },

  // ----------------------
  // 🛡️ Custom Fetch Wrapper (Timeout + AbortSignal)
  // ----------------------
  fetch: async (url, options) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 seconds

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response;
    } catch (err) {
      console.error(
        "❌ [Supabase Fetch Error]",
        err.name === "AbortError" ? "Request timed out" : err.message
      );
      throw err;
    }
  },
});

// ----------------------
// 🧪 Dev logging
// ----------------------
if (NODE_ENV !== "production") {
  console.log("✅ Supabase Backend Client Ready");
  console.log("→ URL:", SUPABASE_URL);
  console.log("→ Mode:", SUPABASE_SERVICE_ROLE_KEY ? "Service Role Key" : "Anon Key");
}

export default supabase;
