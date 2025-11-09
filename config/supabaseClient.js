// backend/config/supabaseClient.js
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  SUPABASE_BUCKET,
  NODE_ENV,
} = process.env;

if (!SUPABASE_URL) {
  throw new Error("[Supabase] Missing SUPABASE_URL in environment variables.");
}

if (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY) {
  throw new Error(
    "[Supabase] Missing both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY. Please set at least one."
  );
}

const supabaseKey =
  SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY.trim() !== ""
    ? SUPABASE_SERVICE_ROLE_KEY
    : SUPABASE_ANON_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY && NODE_ENV === "production") {
  // Warn if running in production without a service role key.
  console.warn(
    "[Supabase] Running in production without SUPABASE_SERVICE_ROLE_KEY — RLS may block reads."
  );
}

// Prefer globalThis.fetch where available (Node 18+)
const nativeFetch = globalThis.fetch;

const supabase = createClient(SUPABASE_URL, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      "X-Client-Name": "AIAERA-Backend",
    },
  },
  fetch: async (url, options) => {
    if (!nativeFetch) {
      throw new Error(
        "[Supabase] global.fetch is not available in this Node runtime. Please use Node 18+ or polyfill fetch."
      );
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await nativeFetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (err) {
      clearTimeout(timeout);
      console.error("[Supabase Fetch Error]", err?.message || err);
      throw err;
    }
  },
});

export const BUCKET = SUPABASE_BUCKET || "chatbot-files";

if (NODE_ENV !== "production") {
  console.log("✅ [Supabase] Backend client initialized.");
  console.log("   URL:", SUPABASE_URL);
  console.log("   Auth Mode:", SUPABASE_SERVICE_ROLE_KEY ? "Service Role Key" : "Anon Key");
}

export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from("chatbots")
      .select("id, business_info")
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("[Supabase testConnection] query error:", error.message || error);
      return { ok: false, error };
    }
    return { ok: true, data };
  } catch (err) {
    console.error("[Supabase testConnection] unexpected error:", err);
    return { ok: false, error: err };
  }
};

export default supabase;
