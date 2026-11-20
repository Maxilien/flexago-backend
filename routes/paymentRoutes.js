
// routes/paymentRoutes.js
// ------------------------------------------------------
// Flexago Payment Routes
// ------------------------------------------------------

console.log("🟢 paymentRoutes.js LOADED");

const express = require("express");
const { requireDeliveryParticipant } = require("../middleware/access");
const auth = require("../middleware/auth");

const adminAuth = require("../middleware/adminAuth");

const {
  createSetupIntent,
  savePaymentMethod,
  createDeliveryPayment,
  getDeliveryPaymentStatus,
  releaseTravelerPayment
} = require("../controllers/paymentController");

const router = express.Router();

// The account comes from the login token, not the request body.
function useLoggedInUser(field) {
  return (req, res, next) => {
    req.body = { ...req.body, [field]: req.user.id };
    next();
  };
}

/* ============================================================
   SENDER PAYMENT METHOD
============================================================ */

// Create a Stripe SetupIntent
router.post(
  "/setup-intent",
  auth,
  useLoggedInUser("userId"),
  createSetupIntent
);

// Save a verified Stripe payment method
router.put(
  "/payment-method",
  auth,
  useLoggedInUser("userId"),
  savePaymentMethod
);

/* ============================================================
   DELIVERY PAYMENT
============================================================ */

// Create or retrieve the PaymentIntent for a delivery
router.post(
  "/create-delivery-payment",
  auth,
  useLoggedInUser("senderId"),
  createDeliveryPayment
);

// Retrieve the latest payment status for a delivery
router.get(
  "/delivery/:deliveryId/status",
  auth,
  requireDeliveryParticipant(),
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