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
import paymentRouter from "./routes/paymentRoutes.js";
import integrationsRouter from "./routes/integrations.js";
import embedRouter from "./routes/embed.js";
import chatbotRouter from "./routes/chatbot.js";
import chatbotPreviewRouter from "./routes/chatbotPreview.js";
import chatbotSaveRouter from "./routes/chatbotSave.js";
import cleanupContextRouter from "./routes/cleanupContext.js"; // ✅ NEW: Chat context cleanup route

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
// Razorpay Webhook (raw body parsing)
// ----------------------
app.use("/api/payment-webhook", express.raw({ type: "*/*" }));

// ----------------------
// JSON & URL-encoded body parsing
// ----------------------
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ----------------------
// Logging (only in dev mode)
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
// Core API routes
// ----------------------
app.use("/api", apiRouter);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/payment-webhook", paymentWebhookRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/integrations", integrationsRouter);

// ----------------------
// Chatbot routes
// ----------------------

// ✅ Public builder save/update
app.use("/api/chatbot", chatbotSaveRouter);

// ✅ Public chatbot (embed/live chat)
app.use("/api/chatbot/public", chatbotRouter);

// ✅ Secure chatbot (authenticated users)
app.use("/api/chatbot/secure", requireAuth, chatbotRouter);

// ✅ Live preview route for Builder
app.use("/api/chatbot-preview", chatbotPreviewRouter);
console.log("✅ Chatbot preview route mounted at /api/chatbot-preview");

// ✅ Cleanup route (removes old chat contexts)
app.use("/api/cleanup-context", cleanupContextRouter);
console.log("🧹 Cleanup route mounted at /api/cleanup-context");

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

// ----------------------
// 404 handler
// ----------------------
app.use((req, res) => {
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
  console.log("🚀 AIAERA backend running on port", PORT);
  console.log("✅ Chatbot preview route mounted at /api/chatbot-preview");
  console.log("✅ Chatbot save route mounted at /api/chatbot");
  console.log("🧹 Cleanup route available at /api/cleanup-context");
});

export default app;
