\// routes/travelerRoutes.js
// ------------------------------------------------------
// Flexago Traveler Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 travelerRoutes.js LOADED");

const express = require("express");
const {
  createTraveler,
  getTravelerByUser,
  updateTravelerLocation,
  getTravelerById   // ⭐ NEW IMPORT
} = require("../controllers/travelerController");

const {
  acceptTravelerJob,
  completeTravelerJob
} = require("../controllers/deliveryController");

const router = express.Router();

// Traveler profile
router.post("/", createTraveler);

// Get traveler by USER ID
router.get("/user/:userId", getTravelerByUser);

// ⭐ NEW — Get traveler by TRAVELER ID (used by Sender app)
router.get("/:id", getTravelerById);

// Update traveler location
router.put("/location/:userId", updateTravelerLocation);

// Traveler job actions
router.post("/jobs/:jobId/accept", acceptTravelerJob);
router.post("/jobs/:jobId/complete", completeTravelerJob);

module.exports = router;

