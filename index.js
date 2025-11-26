// backend/index.js
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

// 🆕 External Webhooks (Meta)
import whatsappWebhookRouter from "./routes/webhooks/whatsapp.js";
import facebookWebhookRouter from "./routes/webhooks/facebook.js";
import instagramWebhookRouter from "./routes/webhooks/instagram.js";

import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ----------------------
// Reverse proxy (Render)
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
// ✅ STREAM-SAFE COMPRESSION (CRITICAL FIX)
// ----------------------
app.use((req, res, next) => {
  if (req.path.includes("/preview-stream")) {
    return next(); // ❌ Disable compression for SSE
  }
  return compression()(req, res, next);
});

// ----------------------
// CORS (safe multi-domain mode)
// ----------------------
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ----------------------
// Razorpay webhook (raw body)
// ----------------------
app.use("/api/payment-webhook", express.raw({ type: "*/*" }));

// ----------------------
// JSON parser (after raw)
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
// Health route
// ----------------------
app.get("/", (req, res) => {
  res.json({
    status: "✅ AIAERA backend is running!",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// ----------------------
// Mount CORE Routes
// ----------------------
console.log("🚀 Mounting all core API routes...");

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
// Chatbot Main Routes
// ----------------------
app.use("/api/chatbot", chatbotRouter);

// ----------------------
// 🚀 ✅ STREAMING ROUTE (MUST BE BEFORE 404)
// FINAL URL:
// /api/chatbot/preview-stream/:id
// ----------------------
app.use("/api/chatbot", chatbotPreviewStream);

console.log("💬 Chatbot + Stream routes active");

// ----------------------
// Meta Webhooks
// ----------------------
app.use("/api/webhooks/whatsapp", whatsappWebhookRouter);
app.use("/api/webhooks/facebook", facebookWebhookRouter);
app.use("/api/webhooks/instagram", instagramWebhookRouter);

console.log("📡 WhatsApp/Facebook/Instagram webhooks active");

// ----------------------
// 404 Handler
// ----------------------
app.use((req, res) => {
  console.warn(`⚠️ 404 Not Found: ${req.originalUrl}`);
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
// Start Server
// ----------------------
app.listen(PORT, () => {
  console.log(`🚀 AIAERA backend running on port ${PORT}`);
  console.log("✅ All routes loaded successfully");
});

export default app;
