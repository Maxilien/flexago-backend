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

const Traveler = require("../models/Traveler");   // ⭐ REQUIRED for background check enforcement

const router = express.Router();

// Traveler profile
router.post("/", createTraveler);
router.get("/user/:userId", getTravelerByUser);
router.put("/location/:userId", updateTravelerLocation);

/* ============================================================
   ⭐ Traveler Job Acceptance — Background Check Enforcement
   ============================================================ */

router.post("/jobs/:jobId/accept", async (req, res) => {
  try {
    const travelerId = req.body.travelerId;

    // Load traveler record
    const traveler = await Traveler.findById(travelerId);
    if (!traveler) {
      return res.status(404).json({ error: "Traveler not found." });
    }

    // ⭐ BLOCK TRAVELERS WHO DID NOT PASS BACKGROUND CHECK
    if (traveler.background_status !== "clear") {
      return res.status(403).json({
        error: "Background check required before accepting jobs."
      });
    }

    // Continue to original controller logic
    return acceptTravelerJob(req, res);

  } catch (err) {
    console.error("❌ Error in job acceptance:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   Traveler Job Completion
   ============================================================ */

router.post("/jobs/:jobId/complete", completeTravelerJob);

module.exports = router;
