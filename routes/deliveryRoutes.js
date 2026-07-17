// routes/deliveryRoutes.js
// ------------------------------------------------------
// Flexago Delivery Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 deliveryRoutes.js LOADED");

const express = require("express");
const {
  createDelivery,
  searchTravelerJobs,
  acceptTravelerJob,
  pickupTravelerJob,
  deliverTravelerJob,
  completeTravelerJob,
  payoutTravelerJob
} = require("../controllers/deliveryController");

const router = express.Router();

// Sender creates a delivery
router.post("/", (req, res, next) => {
  console.log("🔥 DELIVERY ROUTE HIT");
  next();
}, createDelivery);

// Traveler job search (POST because it requires JSON body)
router.post("/search", searchTravelerJobs);

// Traveler accepts a job
router.post("/:jobId/accept", acceptTravelerJob);

// Traveler picks up a job
router.post("/:jobId/pickup", pickupTravelerJob);

// Traveler delivers a job
router.post("/:jobId/deliver", deliverTravelerJob);

// Traveler completes a job
router.post("/:jobId/complete", completeTravelerJob);

// Traveler payout
router.post("/:jobId/payout", payoutTravelerJob);

module.exports = router;
