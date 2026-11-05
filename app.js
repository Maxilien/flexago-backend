// backend/app.js  (CommonJS VERSION)
// ------------------------------------------------------
// Flexago Backend App Initialization
// ------------------------------------------------------

console.log("🟢 app.js LOADED");

const fs = require("fs");

// ============================================================
// GOOGLE CLOUD CREDENTIAL LOADER (Render + Local)
// ============================================================

if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    fs.writeFileSync(
      "service-account.json",
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    );

    console.log(
      "🔐 Google credentials loaded from Render env variable."
    );
  } catch (err) {
    console.error(
      "❌ Failed to write service-account.json:",
      err
    );
  }
}

const express = require("express");
const cors = require("cors");

/* ============================================================
   ROUTE IMPORTS (CommonJS)
============================================================ */

// Legacy Explorer routes

// MongoDB-powered routes
const userRoutes = require("./routes/userRoutes");
const travelerRoutes = require("./routes/travelerRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");

// Delivery Chat routes
const deliveryChatRoutes = require(
  "./routes/deliveryChatRoutes"
);
// Support Ticket routes
const supportTicketRoutes = require(
  "./routes/supportTicketRoutes"
);
// Rating routes
const ratingRoutes = require(
  "./routes/ratingRoutes"
);
const paymentRoutes = require("./routes/paymentRoutes");
const stripeWebhookRoutes = require(
  "./routes/stripeWebhook"
);
const travelerStripeRoutes = require(
  "./routes/TravelerStripeRoutes"
);

// Upload routes

// Identity Verification Routes (Stripe Identity)
const identityWebhook = require(
  "./routes/identityWebhook"
);

// Email Verification Route

// Create Account Route

// Twilio Phone Verification Route

// ADMIN ROUTES
const adminAuthRoutes = require("./routes/adminAuth");
const adminUsersRoutes = require("./routes/adminUsers");

// Deliveries replaces Orders
const adminDeliveriesRoutes = require(
  "./routes/adminDeliveries"
);

const adminEscrowRoutes = require(
  "./routes/adminEscrow"
);

const adminPayoutsRoutes = require(
  "./routes/adminPayouts"
);

const adminRevenueRoutes = require(
  "./routes/adminRevenue"
);

const adminAnalyticsRoutes = require(
  "./routes/adminAnalytics"
);

// Admin Background Check Dashboard
const adminBackgroundRoutes = require(
  "./routes/adminBackground"
);

// Support Chat Route
const supportChatRoute = require("./support/chat");

// Checkr Background Check Webhook
const checkrWebhookRoute = require(
  "./routes/checkrWebhook"
);

const errorHandler = require(
  "./middleware/errorHandler"
);

const app = express();

/* ============================================================
   CORE MIDDLEWARE (UPDATED CORS)
============================================================ */

const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1",
  "http://localhost",
  "https://flexago-frontend.onrender.com",
  "https://flexago-backend.onrender.com",
  "https://www.flexagoo.com",
  "https://flexagoo.com",
  "https://app.flexagoo.com",
  "capacitor://localhost",
  "https://localhost"
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE"
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-user-id",
      "x-user-role"
    ],
    credentials: true
  })
);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header(
      "Access-Control-Allow-Origin",
      origin
    );
  }

  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-user-id, x-user-role"
  );

  next();
});

app.options("*", cors());

// Render sits in front of this app; needed for per-IP rate limits.
app.set("trust proxy", 1);

// Stripe Payment webhook must run before express.json()
app.use(
  "/api/payments/webhook",
  stripeWebhookRoutes
);

// Stripe Identity webhook requires raw request body
app.use(
  "/webhook",
  express.raw({
    type: "application/json"
  })
);

// Checkr webhook needs the raw body to verify its signature
app.use(
  "/api/checkr/webhook",
  express.raw({
    type: "application/json"
  })
);

// Larger limit only where photos are sent
app.use("/api/deliveries", express.json({ limit: "12mb" }));
app.use("/api/users/me/photo", express.json({ limit: "6mb" }));

// JSON parser for all other routes
app.use(express.json());

// Static uploads
app.use(
  "/uploads",
  express.static("uploads")
);

/* ============================================================
   ROUTES (ORDER MATTERS)
============================================================ */

// Delivery routes
app.use(
  "/api/deliveries",
  deliveryRoutes
);

// Delivery Chat routes
app.use(
  "/api/delivery-chat",
  deliveryChatRoutes
);
// Support Ticket routes
app.use(
  "/api/support-tickets",
  supportTicketRoutes
);
// Rating routes
app.use(
  "/api/ratings",
  ratingRoutes
);
// Payment routes
app.use(
  "/api/payments",
  paymentRoutes
);

// Traveler DB routes
app.use(
  "/api/travelers-db",
  travelerRoutes
);

// Traveler job actions
app.use(
  "/api/traveler",
  travelerRoutes
);

// Traveler Stripe Connect
app.use(
  "/api/traveler-stripe",
  travelerStripeRoutes
);

// User routes
app.use(
  "/api/users",
  userRoutes
);

// Strict signup
app.use(
  "/api/onboarding",
  require("./routes/onboardingRoutes")
);

// Report and block
app.use(
  "/api/safety",
  require("./routes/safetyRoutes")
);

// Stripe Identity Webhook
app.use(
  "/webhook",
  identityWebhook
);

// Support Chat API
app.use(
  "/api/support/chat",
  supportChatRoute
);

// Checkr Background Check Webhook
app.use(
  "/api/checkr/webhook",
  checkrWebhookRoute
);

/* ============================================================
   ADMIN ROUTES (JWT PROTECTED)
============================================================ */

app.use(
  "/api/admin",
  adminAuthRoutes
);

app.use(
  "/api/admin/users",
  adminUsersRoutes
);

// Deliveries replaces Orders
app.use(
  "/api/admin/deliveries",
  adminDeliveriesRoutes
);

app.use(
  "/api/admin/escrow",
  adminEscrowRoutes
);

app.use(
  "/api/admin/payouts",
  adminPayoutsRoutes
);

app.use(
  "/api/admin/revenue",
  adminRevenueRoutes
);

app.use(
  "/api/admin/analytics",
  adminAnalyticsRoutes
);

// Admin Background Check Dashboard
app.use(
  "/api/admin/background",
  adminBackgroundRoutes
);

/* ============================================================
   ERROR HANDLER
============================================================ */

app.use(errorHandler);

/* ============================================================
   EXPORT
============================================================ */

module.exports = app;
