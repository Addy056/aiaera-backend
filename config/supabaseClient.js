// backend/config/supabaseClient.js
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

/* ----------------------------------------------------
   ENVIRONMENT VARIABLES
---------------------------------------------------- */
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_BUCKET,
  NODE_ENV
} = process.env;

/* ----------------------------------------------------
   VALIDATION
---------------------------------------------------- */
if (!SUPABASE_URL) {
  throw new Error("❌ Missing SUPABASE_URL");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️ WARNING: No SUPABASE_SERVICE_ROLE_KEY set! Backend needs this.");
}

/* ----------------------------------------------------
   CREATE SUPABASE BACKEND CLIENT
   (SERVICE ROLE → full access with RLS bypass)
---------------------------------------------------- */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      "X-Client-Info": "AIAERA-Backend"
    }
  },
  db: {
    schema: "public"
  }
});

/* ----------------------------------------------------
   DEFAULT BUCKET NAME
---------------------------------------------------- */
export const BUCKET = SUPABASE_BUCKET || "chatbot-files";

/* ----------------------------------------------------
   CONNECTION TEST METHOD
---------------------------------------------------- */
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from("chatbots")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("⚠️ testConnection error:", error.message);
      return { ok: false, error };
    }

    return { ok: true, data };
  } catch (err) {
    console.error("🔥 testConnection failed:", err);
    return { ok: false, error: err };
  }
};

/* ----------------------------------------------------
   STARTUP LOG
---------------------------------------------------- */
if (NODE_ENV !== "production") {
  console.log("✅ Supabase (Backend) Ready");
  console.log("URL:", SUPABASE_URL);
  console.log("Using:", SUPABASE_SERVICE_ROLE_KEY ? "Service Role Key" : "❌ NONE");
}

export default supabase;
