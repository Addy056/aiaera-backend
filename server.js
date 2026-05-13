import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import morgan from "morgan";

import { fileURLToPath } from "url";

/*
========================================
ROUTES
========================================
*/
import chatbotRoutes from "./routes/chatbot.routes.js";
import leadsRoutes from "./routes/leads.routes.js";
import appointmentsRoutes from "./routes/appointments.routes.js";
import integrationsRoutes from "./routes/integrations.routes.js";
import embedRoutes from "./routes/embed.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import publicRoutes from "./routes/public.routes.js";

/*
========================================
ENV CONFIG
========================================
*/
dotenv.config();

/*
========================================
APP INIT
========================================
*/
const app = express();

/*
========================================
ES MODULE FIX
========================================
*/
const __filename =
  fileURLToPath(
    import.meta.url
  );

const __dirname =
  path.dirname(
    __filename
  );

/*
========================================
TRUST PROXY
========================================
*/
app.set(
  "trust proxy",
  1
);

/*
========================================
ENV VALIDATION
========================================
*/
const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

requiredEnv.forEach(
  (envVar) => {

    if (
      !process.env[
        envVar
      ]
    ) {

      console.error(
        `❌ Missing ENV Variable: ${envVar}`
      );

      process.exit(1);
    }
  }
);

/*
========================================
CORS CONFIG
========================================
*/
const allowedOrigins = [

  /*
  ========================================
  LOCAL
  ========================================
  */
  "http://localhost:5173",

  "http://localhost:3000",

  /*
  ========================================
  PRODUCTION DOMAINS
  ========================================
  */
  "https://aiaera.in",

  "https://www.aiaera.in",

  "https://aiaera-frontend.vercel.app",

  /*
  ========================================
  ENV URL
  ========================================
  */
  process.env.FRONTEND_URL,

].filter(Boolean);

app.use(
  cors({
    origin: function (
      origin,
      callback
    ) {

      /*
      ========================================
      SERVER / POSTMAN
      ========================================
      */
      if (!origin) {

        return callback(
          null,
          true
        );
      }

      /*
      ========================================
      EXACT MATCH
      ========================================
      */
      if (
        allowedOrigins.includes(
          origin
        )
      ) {

        return callback(
          null,
          true
        );
      }

      /*
      ========================================
      VERCEL PREVIEW SUPPORT
      ========================================
      */
      if (
        origin.endsWith(
          ".vercel.app"
        )
      ) {

        return callback(
          null,
          true
        );
      }

      console.error(
        "❌ CORS BLOCKED:",
        origin
      );

      return callback(
        new Error(
          `CORS blocked origin: ${origin}`
        ),
        false
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

/*
========================================
PREFLIGHT REQUESTS
========================================
*/
app.options(
  "*",
  cors()
);

/*
========================================
BODY PARSER
========================================
*/
app.use(
  express.json({
    limit: "20mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "20mb",
  })
);

/*
========================================
LOGGER
========================================
*/
app.use(
  morgan("dev")
);

/*
========================================
STATIC FILES
========================================
*/
app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);

/*
========================================
ROOT ROUTE
========================================
*/
app.get(
  "/",
  (req, res) => {

    return res.status(200).json({
      success: true,

      message:
        "AIAERA Backend Running 🚀",
    });
  }
);

/*
========================================
HEALTH CHECK
========================================
*/
app.get(
  "/api/test",
  (req, res) => {

    return res.status(200).json({
      success: true,

      message:
        "Backend working properly 🚀",

      timestamp:
        new Date().toISOString(),
    });
  }
);

/*
========================================
API ROUTES
========================================
*/
app.use(
  "/api/chatbot",
  chatbotRoutes
);

app.use(
  "/api/public",
  publicRoutes
);

app.use(
  "/api/leads",
  leadsRoutes
);

app.use(
  "/api/appointments",
  appointmentsRoutes
);

app.use(
  "/api/integrations",
  integrationsRoutes
);

app.use(
  "/api/embed",
  embedRoutes
);

app.use(
  "/api/upload",
  uploadRoutes
);

app.use(
  "/api/payment",
  paymentRoutes
);

/*
========================================
STATIC EMBED SCRIPT
========================================
*/
app.get(
  "/embed.js",
  (req, res) => {

    return res.sendFile(
      path.join(
        __dirname,
        "public",
        "embed.js"
      )
    );
  }
);

/*
========================================
404 HANDLER
========================================
*/
app.use(
  (req, res) => {

    return res.status(404).json({
      success: false,

      error:
        "Route not found",

      path:
        req.originalUrl,
    });
  }
);

/*
========================================
GLOBAL ERROR HANDLER
========================================
*/
app.use(
  (
    err,
    req,
    res,
    next
  ) => {

    console.error(
      "❌ SERVER ERROR:",
      err
    );

    return res.status(
      err.status || 500
    ).json({
      success: false,

      error:
        process.env
          .NODE_ENV ===
        "production"
          ? "Internal server error"
          : err.message,
    });
  }
);

/*
========================================
PORT
========================================
*/
const PORT =
  process.env.PORT ||
  5000;

/*
========================================
START SERVER
========================================
*/
app.listen(
  PORT,
  () => {

    console.log(`
========================================
🚀 AIAERA BACKEND RUNNING
========================================
MODE:
${process.env.NODE_ENV || "development"}

PORT:
${PORT}

LOCAL:
http://localhost:${PORT}

HEALTH:
http://localhost:${PORT}/api/test
========================================
`);
  }
);