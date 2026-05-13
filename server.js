/*
========================================
CORS CONFIG
========================================
*/
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",

  process.env.FRONTEND_URL,

  "https://your-frontend.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: function (
      origin,
      callback
    ) {

      /*
      ========================================
      ALLOW:
      - POSTMAN
      - MOBILE APPS
      - SERVER REQUESTS
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
        origin.includes(
          ".vercel.app"
        )
      ) {

        return callback(
          null,
          true
        );
      }

      console.error(
        "CORS BLOCKED:",
        origin
      );

      return callback(
        new Error(
          "CORS policy blocked this origin"
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