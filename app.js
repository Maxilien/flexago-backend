// ⭐ NEW — Support Chat Route
const supportChatRoute = require("./support/chat");

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
