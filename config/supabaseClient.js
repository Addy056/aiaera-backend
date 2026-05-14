import {
  createClient,
} from "@supabase/supabase-js";

import dotenv from "dotenv";

/*
========================================
LOAD ENV
========================================
*/
dotenv.config();

/*
========================================
ENV VARIABLES
========================================
*/
const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseServiceKey =
  process.env
    .SUPABASE_SERVICE_ROLE_KEY;

/*
========================================
VALIDATION
========================================
*/
if (!supabaseUrl) {

  console.error(
    "❌ Missing SUPABASE_URL"
  );

  process.exit(1);
}

if (!supabaseServiceKey) {

  console.error(
    "❌ Missing SUPABASE_SERVICE_ROLE_KEY"
  );

  process.exit(1);
}

/*
========================================
CREATE CLIENT
========================================
*/
export const supabase =
  createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {

        autoRefreshToken:
          false,

        persistSession:
          false,
      },

      global: {

        headers: {
          "x-application-name":
            "AIAERA",
        },
      },

      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );

/*
========================================
STARTUP LOG
========================================
*/
console.log(
  "✅ Supabase client initialized"
);