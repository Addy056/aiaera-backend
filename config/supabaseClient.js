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
  global.supabaseInstance;

/*
========================================
CREATE CLIENT
========================================
*/
const createSupabaseClient =
  () => {

    /*
    ========================================
    REUSE EXISTING CLIENT
    ========================================
    */
    if (
      supabaseInstance
    ) {

      return supabaseInstance;
    }

    /*
    ========================================
    CREATE CLIENT
    ========================================
    */
    supabaseInstance =
      createClient(
        supabaseUrl,
        supabaseServiceKey,
        {

          auth: {

            /*
            ========================================
            BACKEND SHOULD NEVER
            STORE SESSIONS
            ========================================
            */
            persistSession:
              false,

            /*
            ========================================
            DISABLE AUTO REFRESH
            ========================================
            */
            autoRefreshToken:
              false,

            /*
            ========================================
            BACKEND DOES NOT
            USE URL SESSIONS
            ========================================
            */
            detectSessionInUrl:
              false,
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

          /*
          ========================================
          REALTIME LIMITS
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
        }
      );

    /*
    ========================================
    SAVE GLOBALLY
    ========================================
    */
    global.supabaseInstance =
      supabaseInstance;

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