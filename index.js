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
import apiRouter from "./routes/index.js";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/user.js";
import leadsRouter from "./routes/leads.js";
import appointmentsRouter from "./routes/appointments.js";
import subscriptionsRouter from "./routes/subscriptions.js";
import paymentWebhookRouter from "./routes/paymentWebhook.js";
import paymentRouter from "./routes/payment.js"; // ✅ ensure file name matches exactly
import integrationsRouter from "./routes/integrations.js";
import embedRouter from "./routes/embed.js";
import chatbotRouter from "./routes/chatbot.js";
import chatbotPreviewRouter from "./routes/chatbotPreview.js";
import chatbotSaveRouter from "./routes/chatbotSave.js";
import cleanupContextRouter from "./routes/cleanupContext.js";

// ----------------------
// Middleware
// ----------------------
import { requireAuth } from "./middleware/authMiddleware.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ----------------------
// Trust proxy (for Render)
// ----------------------
app.set("trust proxy", 1);

// ----------------------
// Security & Performance
// ----------------------
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    frameguard: false,
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
// Logging
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
// Mount Routes (with logging for debugging)
// ----------------------
console.log("🚀 Mounting all API routes...");

app.use("/api", apiRouter);
console.log("✅ /api route active");

app.use("/api/auth", authRouter);
console.log("✅ /api/auth route active");

app.use("/api/user", userRouter);
console.log("✅ /api/user route active");

app.use("/api/leads", leadsRouter);
console.log("✅ /api/leads route active");

app.use("/api/appointments", appointmentsRouter);
console.log("✅ /api/appointments route active");

app.use("/api/subscriptions", subscriptionsRouter);
console.log("✅ /api/subscriptions route active");

app.use("/api/payment-webhook", paymentWebhookRouter);
console.log("✅ /api/payment-webhook route active");

app.use("/api/payment", paymentRouter);
console.log("✅ /api/payment route active");

app.use("/api/integrations", integrationsRouter);
console.log("✅ /api/integrations route active");

// ----------------------
// Chatbot routes
// ----------------------
app.use("/api/chatbot", chatbotSaveRouter);
console.log("✅ /api/chatbot save route active");

app.use("/api/chatbot/public", chatbotRouter);
console.log("✅ /api/chatbot/public route active");

app.use("/api/chatbot/secure", requireAuth, chatbotRouter);
console.log("✅ /api/chatbot/secure route active");

app.use("/api/chatbot-preview", chatbotPreviewRouter);
console.log("✅ /api/chatbot-preview route active");

app.use("/api/cleanup-context", cleanupContextRouter);
console.log("🧹 /api/cleanup-context route active");

// ----------------------
// Embed routes
// ----------------------
app.use(
  "/api/embed",
  (req, res, next) => {
    res.removeHeader("X-Frame-Options");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.setHeader("Cache-Control", "public, max-age=3600");
    next();
  },
  embedRouter
);
console.log("✅ /api/embed route active");

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
// Global error handler
// ----------------------
app.use(errorHandler);

// ----------------------
// Start Server
// ----------------------
app.listen(PORT, () => {
  console.log(`🚀 AIAERA backend running on port ${PORT}`);
  console.log("✅ All core routes initialized successfully.");
});

export default app;
