
// routes/paymentRoutes.js
// ------------------------------------------------------
// Flexago Payment Routes
// ------------------------------------------------------

console.log("🟢 paymentRoutes.js LOADED");

const express = require("express");

const adminAuth = require("../middleware/adminAuth");

const {
  createSetupIntent,
  savePaymentMethod,
  createDeliveryPayment,
  getDeliveryPaymentStatus,
  releaseTravelerPayment
} = require("../controllers/paymentController");

const router = express.Router();

/* ============================================================
   SENDER PAYMENT METHOD
============================================================ */

// Create a Stripe SetupIntent
router.post(
  "/setup-intent",
  createSetupIntent
);

// Save a verified Stripe payment method
router.put(
  "/payment-method",
  savePaymentMethod
);

/* ============================================================
   DELIVERY PAYMENT
============================================================ */

// Create or retrieve the PaymentIntent for a delivery
router.post(
  "/create-delivery-payment",
  createDeliveryPayment
);

// Retrieve the latest payment status for a delivery
router.get(
  "/delivery/:deliveryId/status",
  getDeliveryPaymentStatus
);

/* ============================================================
   TRAVELER PAYMENT RELEASE
============================================================ */

// Release or retry a funded delivery payment to the traveler.
// Restricted to admin/superadmin because this endpoint can
// initiate a real Stripe transfer.
router.post(
  "/release",
  adminAuth,
  releaseTravelerPayment
);
/* ============================================================
   EXPORT
============================================================ */

module.exports = router;