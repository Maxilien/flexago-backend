// backend/app.js  (CommonJS VERSION)
// ------------------------------------------------------
// Flexago Backend App Initialization
// ------------------------------------------------------

console.log("🟢 app.js LOADED");

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

// ⭐ NEW — Create Account Route
const createAccountRoutes = require("./routes/create-account");

// ⭐ NEW — Twilio Phone Verification Route
const verifyPhoneRoutes = require("./routes/verify");   // <── THIS IS THE FIX

const errorHandler = require("./middleware/errorHandler");

const app = express();

/* ============================================================
   CORE MIDDLEWARE (UPDATED CORS)
   ============================================================ */

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1",
    "http://localhost",
    "https://flexago-frontend.onrender.com",
    "https://flexago-backend.onrender.com"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

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

// ⭐ NEW — Twilio Phone Verification (THIS FIXES YOUR 404)
app.use("/api/verify", verifyPhoneRoutes);

// Stripe Identity Webhook (verification events)
app.use("/webhook", identityWebhook);

// ⭐ NEW — Create Account (Traveler/Sender)
app.use("/api/account", createAccountRoutes);

/* ============================================================
   ERROR HANDLER
   ============================================================ */

app.use(errorHandler);

/* ============================================================
   EXPORT
   ============================================================ */

module.exports = app;

