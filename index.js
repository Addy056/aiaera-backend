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
import chatbotRouter from "./routes/chatbot.js"; // ✅ single clean import
import { requireAuth } from "./middleware/authMiddleware.js"; // ✅ imported directly
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ----------------------
// Trust proxy (needed for Render, cookies, secure sessions)
// ----------------------
app.set("trust proxy", 1);

// ----------------------
// Security & Performance Middlewares
// ----------------------
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // disabled for iframe embeds
    frameguard: false, // disable X-Frame-Options globally
  })
);
app.use(compression());

// ----------------------
// CORS (allow all origins for simplicity)
// ----------------------
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ----------------------
// Razorpay webhook requires raw body
// ----------------------
app.use("/api/payment-webhook", express.raw({ type: "*/*" }));

// ----------------------
// Parse JSON & URL-encoded
// ----------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------
// Logging
// ----------------------
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ----------------------
// Health check endpoint
// ----------------------
app.get("/", (req, res) => {
  res.json({ status: "✅ AIAERA backend is running!" });
});

// ----------------------
// Mount API Routes
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
// Chatbot Routes
// ----------------------

// ✅ Public (unauthenticated) chatbot routes for website embeds
app.use("/api/chatbot/public", chatbotRouter);

// ✅ Authenticated chatbot routes (used inside app dashboard/builder)
app.use("/api/chatbot", requireAuth, chatbotRouter);

// ----------------------
// Embed routes: fully iframe-friendly
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
// 404 for unmatched routes
// ----------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// ----------------------
// Global error handler
// ----------------------
app.use(errorHandler);

// ----------------------
// Start server
// ----------------------
app.listen(PORT, () =>
  console.log(`🚀 AIAERA backend running on port ${PORT}`)
);

export default app;
