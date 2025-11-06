// backend/config/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Ensure required env variables exist
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Supabase URL or Service Role Key is missing in environment variables!"
  );
}

/**
 * Supabase client for backend (uses service role key)
 * - Full access to tables, RLS bypassed
 * - Should never be exposed to frontend
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false, // No local storage/session needed in backend
  },
  global: {
    fetch: globalThis.fetch, // ensure fetch is available in Node 18+
  },
});

export default supabase;
