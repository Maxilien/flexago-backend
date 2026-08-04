// backend/app.js  (CommonJS VERSION)
// ------------------------------------------------------
// Flexago Backend App Initialization
// ------------------------------------------------------

console.log("🟢 app.js LOADED");

const fs = require("fs");

// ============================================================
// ⭐ GOOGLE CLOUD CREDENTIAL LOADER (Render + Local)
// ============================================================
//
// If GOOGLE_APPLICATION_CREDENTIALS_JSON exists (Render),
// write it to service-account.json so Google SDK can load it.
// Locally, you already have service-account.json in the backend folder.
//
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    fs.writeFileSync(
      "service-account.json",
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    );
    console.log("🔐 Google credentials loaded from Render env variable.");
  } catch (err) {
    console.error("❌ Failed to write service-account.json:", err);
  }
}

const express = require("express");
const cors = require("cors");

/* ============================================================
   ROUTE IMPORTS (CommonJS)
   ============================================================ */

// Legacy Explorer routes
const explorerRoutes = require("./routes/explorerRoutes");

// MongoDB-powered routes
const userRoutes = require("./routes/userRoutes");
const travelerRoutes = require("./routes/travelerRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");

// Upload routes
const uploadRoutes = require("./routes/uploadRoutes");

// Identity Verification Routes (Stripe Identity)
const identityRoutes = require("./routes/identity");
const verifyStatusRoutes = require("./routes/verifyStatus");
const identityWebhook = require("./routes/identityWebhook");

// ⭐ NEW — Email Verification Route
const verifyEmailRoutes = require("./routes/verifyEmailRoutes");

// ⭐ NEW — Create Account Route
const createAccountRoutes = require("./routes/create-account");

// ⭐ NEW — Twilio Phone Verification Route
const verifyPhoneRoutes = require("./routes/verify");

// ⭐ NEW — ADMIN ROUTES
const adminAuthRoutes = require("./routes/adminAuth");
const adminUsersRoutes = require("./routes/adminUsers");
const adminOrdersRoutes = require("./routes/adminOrders");
const adminEscrowRoutes = require("./routes/adminEscrow");
const adminPayoutsRoutes = require("./routes/adminPayouts");
const adminRevenueRoutes = require("./routes/adminRevenue");
const adminAnalyticsRoutes = require("./routes/adminAnalytics");

// ⭐ NEW — Admin Background Check Dashboard
const adminBackgroundRoutes = require("./routes/adminBackground");

// ⭐ NEW — Support Chat Route
const supportChatRoute = require("./support/chat");

// ⭐ NEW — Checkr Background Check Webhook
const checkrWebhookRoute = require("./routes/checkrWebhook");

const errorHandler = require("./middleware/errorHandler");

const app = express();

/* ============================================================
   CORE MIDDLEWARE (UPDATED CORS)
   ============================================================ */

const allowedOrigins = [
  // Local development
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1",
  "http://localhost",

  // Render frontend
  "https://flexago-frontend.onrender.com",

  // Render backend
  "https://flexago-backend.onrender.com",

  // Production domains
  "https://www.flexagoo.com",
  "https://flexagoo.com",

  // App subdomain
  "https://app.flexagoo.com"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// ⭐ Dynamic fallback (Render sometimes strips CORS headers)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.options("*", cors());

// IMPORTANT: Stripe Webhooks require RAW body BEFORE express.json()
app.use("/webhook", express.raw({ type: "application/json" }));

// JSON parser for all other routes
app.use(express.json());

// Static uploads
app.use("/uploads", express.static("uploads"));

/* ============================================================
   ROUTES (ORDER MATTERS)
   ============================================================ */

// Upload endpoints
app.use("/api/uploads", uploadRoutes);

// Legacy Explorer routes
app.use("/api", explorerRoutes);

// Delivery routes
app.use("/api/deliveries", deliveryRoutes);

// Traveler DB routes
app.use("/api/travelers-db", travelerRoutes);

// Traveler job actions
app.use("/api/traveler", travelerRoutes);

// User routes
app.use("/api/users", userRoutes);

// Identity Verification (create session)
app.use("/api/verify", identityRoutes);

// Identity Verification Status (check if verified)
app.use("/api/verify", verifyStatusRoutes);

// ⭐ NEW — Email Verification
app.use("/api/verify", verifyEmailRoutes);

// ⭐ NEW — Twilio Phone Verification
app.use("/api/verify", verifyPhoneRoutes);

// Stripe Identity Webhook (verification events)
app.use("/webhook", identityWebhook);

// ⭐ NEW — Create Account (Traveler/Sender)
app.use("/api/account", createAccountRoutes);

// ⭐ NEW — Support Chat API
app.use("/api/support/chat", supportChatRoute);

// ⭐ NEW — Checkr Background Check Webhook
app.use("/api/checkr/webhook", checkrWebhookRoute);

/* ============================================================
   ⭐ ADMIN ROUTES (JWT PROTECTED)
   ============================================================ */

app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/orders", adminOrdersRoutes);
app.use("/api/admin/escrow", adminEscrowRoutes);
app.use("/api/admin/payouts", adminPayoutsRoutes);
app.use("/api/admin/revenue", adminRevenueRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);

// ⭐ NEW — Admin Background Check Dashboard
app.use("/api/admin/background", adminBackgroundRoutes);

/* ============================================================
   ERROR HANDLER
   ============================================================ */

app.use(errorHandler);

/* ============================================================
   EXPORT
   ============================================================ */

module.exports = app;
