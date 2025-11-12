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
import cleanupContextRouter from "./routes/cleanupContext.js";

// 🆕 Webhook routes (Meta Platforms)
import whatsappWebhookRouter from "./routes/webhooks/whatsapp.js";
import facebookWebhookRouter from "./routes/webhooks/facebook.js";
import instagramWebhookRouter from "./routes/webhooks/instagram.js";

// ----------------------
// Middleware
// ----------------------
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ----------------------
// Trust proxy (for Render / Reverse Proxies)
// ----------------------
app.set("trust proxy", 1);

// ----------------------
// Security & Performance Middleware
// ----------------------
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    frameguard: false, // allow embedding chatbot iframes
  })
);
app.use(compression());

// ----------------------
// CORS Configuration
// ----------------------
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ----------------------
// Razorpay Webhook (raw body parsing first!)
// ----------------------
app.use("/api/payment-webhook", express.raw({ type: "*/*" }));

// ----------------------
// JSON & URL-encoded body parsing
// ----------------------
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ----------------------
// Logging (only in development)
// ----------------------
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ----------------------
// Health check route
// ----------------------
app.get("/", (req, res) => {
  res.json({
    status: "✅ AIAERA backend is running!",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// ----------------------
// Mount All Core Routes
// ----------------------
console.log("🚀 Mounting all API routes...");

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/payment-webhook", paymentWebhookRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/chatbot", chatbotRouter); // ✅ includes /public and /config routes
app.use("/api/embed", embedRouter);
app.use("/api/cleanup-context", cleanupContextRouter);

console.log("✅ All core routes active");

// ----------------------
// Webhooks (Meta Platforms)
// ----------------------
app.use("/api/webhooks/whatsapp", whatsappWebhookRouter);
app.use("/api/webhooks/facebook", facebookWebhookRouter);
app.use("/api/webhooks/instagram", instagramWebhookRouter);

console.log("💬 Webhook routes active (WhatsApp, Facebook, Instagram)");

// ----------------------
// Payment Debug Route
// ----------------------
app.get("/api/payment/ping", (req, res) => {
  console.log("✅ /api/payment/ping called");
  res.json({ success: true, message: "Payment route is active and healthy" });
});

// ----------------------
// 404 handler
// ----------------------
app.use((req, res) => {
  console.warn(`⚠️ 404 Route not found: ${req.originalUrl}`);
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
  console.log("✅ All core, webhook, and chatbot routes initialized successfully.");
});

export default app;
