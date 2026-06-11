// routes/travelerRoutes.js
// ------------------------------------------------------
// Flexago Traveler Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 travelerRoutes.js LOADED");

const express = require("express");
const {
  createTraveler,
  getTravelerByUser,
  updateTravelerLocation
} = require("../controllers/travelerController");

const {
  acceptTravelerJob,
  completeTravelerJob
} = require("../controllers/deliveryController");

const router = express.Router();

// Traveler profile
router.post("/", createTraveler);
router.get("/user/:userId", getTravelerByUser);
router.put("/location/:userId", updateTravelerLocation);

// Traveler job actions (ONLY the ones that exist)
router.post("/jobs/:jobId/accept", acceptTravelerJob);
router.post("/jobs/:jobId/complete", completeTravelerJob);

module.exports = router;
