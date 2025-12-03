import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";

// ----------------------
// Routes
// ----------------------
import authRouter from "./routes/auth.js";
import userRouter from "./routes/user.js";
import leadsRouter from "./routes/leads.js";
import appointmentsRouter from "./routes/appointments.js";
import subscriptionsRouter from "./routes/subscriptions.js";
import paymentWebhookRouter from "./routes/paymentWebhook.js";
import paymentRouter from "./routes/payment.js";
import integrationsRouter from "./routes/integrations.js";
import embedRouter from "./routes/embed.js";
import chatbotRouter from "./routes/chatbot.js";
import chatbotPreviewStream from "./routes/chatbotPreviewStream.js";
import cleanupContextRouter from "./routes/cleanupContext.js";

// ✅ Unified Meta Webhook (WhatsApp + Facebook + Instagram)
import metaWebhookRouter from "./routes/metawebhook.js";

import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ----------------------
// Reverse proxy (Render / Vercel safe)
// ----------------------
app.set("trust proxy", 1);

// ----------------------
// Security (iframe + SSE safe)
// ----------------------
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: false,
  })
);

// ----------------------
// ✅ STREAM-SAFE COMPRESSION
// ----------------------
app.use((req, res, next) => {
  if (req.path.includes("/preview-stream")) return next();
  return compression()(req, res, next);
});

// ----------------------
// ✅ PRODUCTION-SAFE CORS
// ----------------------
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["*"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ----------------------
// ✅ Razorpay webhook raw body (SIZE LIMITED)
// ----------------------
app.use(
  "/api/payment-webhook",
  express.raw({
    type: "*/*",
    limit: "2mb",
  })
);

// ----------------------
// ✅ Unified Meta webhook raw guard (SIZE LIMITED)
// ----------------------
app.use(
  "/api/webhook",
  express.json({
    limit: "2mb",
  })
);

// ----------------------
// JSON parser
// ----------------------
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ----------------------
// Logging
// ----------------------
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ----------------------
// Health check
// ----------------------
app.get("/", (req, res) => {
  res.json({
    status: "✅ AIAERA backend is running!",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ----------------------
// Core API Routes
// ----------------------
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/payment-webhook", paymentWebhookRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/cleanup-context", cleanupContextRouter);
app.use("/api/embed", embedRouter);

// ----------------------
// ✅✅✅ PUBLIC STREAM ROUTE (NO AUTH - MUST BE FIRST)
// FINAL URL:
// /api/chatbot/preview-stream/:id
// ----------------------
app.use("/api/chatbot", chatbotPreviewStream);

// ----------------------
// 🔒 PROTECTED CHATBOT ROUTES (AFTER STREAM)
// ----------------------
app.use("/api/chatbot", chatbotRouter);

// ----------------------
// ✅ UNIFIED META WEBHOOK (WA + FB + IG)
// FINAL URLS:
// GET  /api/webhook/meta
// POST /api/webhook/meta
// ----------------------
app.use("/api/webhook", metaWebhookRouter);

// ----------------------
// 404 Handler
// ----------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

// ----------------------
// Global Error Handler
// ----------------------
app.use(errorHandler);

// ----------------------
// ✅ GRACEFUL SHUTDOWN (VERY IMPORTANT FOR WEBHOOKS)
// ----------------------
const server = app.listen(PORT, () => {
  console.log(`🚀 AIAERA backend running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed safely.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received. Shutting down...");
  server.close(() => {
    process.exit(0);
  });
});

export default app;
