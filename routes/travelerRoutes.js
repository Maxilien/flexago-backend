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

const Traveler = require("../models/Traveler");

const router = express.Router();

// Traveler profile
router.post("/", createTraveler);
router.get("/user/:userId", getTravelerByUser);
router.put("/location/:userId", updateTravelerLocation);

/* ============================================================
   ⭐ UPDATE TRAVELER (ADDRESS ONLY — IDENTITY LOCKED)
============================================================ */
router.put("/travelers/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const allowed = {
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      zipcode: req.body.zipcode,
      country: req.body.country,
    };

    const updated = await Traveler.findByIdAndUpdate(
      id,
      { $set: allowed },
      { new: true }
    );

    if (!updated) {
      return res.json({ success: false, error: "Traveler not found" });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Traveler update error:", err);
    res.json({ success: false, error: "Server error" });
  }
});

/* ============================================================
   ⭐ Traveler Job Acceptance — Background Check Enforcement
============================================================ */
router.post("/jobs/:jobId/accept", async (req, res) => {
  try {
    const travelerId = req.body.travelerId;

    const traveler = await Traveler.findById(travelerId);
    if (!traveler) {
      return res.status(404).json({ error: "Traveler not found." });
    }

    if (traveler.background_status !== "clear") {
      return res.status(403).json({
        error: "Background check required before accepting jobs."
      });
    }

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

