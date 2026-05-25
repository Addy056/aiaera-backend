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
PREVENT MULTIPLE CLIENTS
========================================
*/
let supabaseInstance =
  null;

/*
========================================
CREATE CLIENT
========================================
*/
const createSupabaseClient =
  () => {

    if (
      supabaseInstance
    ) {

      return supabaseInstance;
    }

    supabaseInstance =
      createClient(
        supabaseUrl,
        supabaseServiceKey,
        {

          auth: {

            /*
            ========================================
            BACKEND SHOULD NEVER
            PERSIST SESSIONS
            ========================================
            */
            persistSession:
              false,

            /*
            ========================================
            NO AUTO REFRESH
            ========================================
            */
            autoRefreshToken:
              false,

            /*
            ========================================
            NO URL SESSION DETECTION
            ========================================
            */
            detectSessionInUrl:
              false,
          },

          /*
          ========================================
          REALTIME
          ========================================
          */
          realtime: {

            params: {

              eventsPerSecond:
                5,
            },
          },

          /*
          ========================================
          GLOBAL HEADERS
          ========================================
          */
          global: {

            headers: {

              "x-application-name":
                "AIAERA-Backend",
            },
          },

          /*
          ========================================
          DATABASE
          ========================================
          */
          db: {

            schema:
              "public",
          },
        }
      );

    return supabaseInstance;
  };

/*
========================================
EXPORT CLIENT
========================================
*/
export const supabase =
  createSupabaseClient();

/*
========================================
STARTUP LOG
========================================
*/
console.log(
  "✅ Supabase backend initialized"
);