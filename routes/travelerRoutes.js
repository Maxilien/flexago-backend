// routes/travelerRoutes.js
// ------------------------------------------------------
// Flexago Traveler Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 travelerRoutes.js LOADED");

const express = require("express");
const checkr = require("../support/checkr");
const auth = require("../middleware/auth");
const {
  requireRole,
  requireVerified,
  requireSelf,
  requireSelfTraveler,
  requireAssignedTraveler
} = require("../middleware/access");
const {
  getTravelerByUser,
  updateTravelerLocation
} = require("../controllers/travelerController");

const {
  acceptTravelerJob,
  completeTravelerJob
} = require("../controllers/deliveryController");

const Traveler = require("../models/Traveler");

const router = express.Router();

// Background check: returns Checkr's hosted application link.
router.post("/background-check/start", auth, requireRole("traveler"), requireVerified, async (req, res) => {
  try {
    const traveler = await Traveler.findOne({ user: req.user.id });
    const user = req.user.user;

    if (!traveler) {
      return res.status(404).json({ success: false, error: "Traveler profile not found." });
    }

    if (traveler.background_status === "clear") {
      return res.json({ success: true, alreadyClear: true });
    }

    if (!checkr.isConfigured()) {
      return res.status(503).json({ success: false, error: "Background checks aren't available yet." });
    }

    if (!user.state) {
      return res.status(400).json({
        success: false,
        code: "ADDRESS_REQUIRED",
        error: "Add your address in Account & Identity first."
      });
    }

    if (traveler.checkr_invitation_url) {
      return res.json({ success: true, url: traveler.checkr_invitation_url });
    }

    traveler.checkr_candidate_id =
      traveler.checkr_candidate_id || await checkr.createCandidate(user);

    traveler.checkr_invitation_url =
      await checkr.createInvitation(traveler.checkr_candidate_id, user);

    await traveler.save();

    return res.json({ success: true, url: traveler.checkr_invitation_url });
  } catch (err) {
    console.error("Background check error:", err.message);
    return res.status(502).json({ success: false, error: "Unable to start your background check." });
  }
});

// Traveler profile
router.get("/user/:userId", auth, requireSelf("userId"), getTravelerByUser);
router.put("/location/:userId", auth, requireSelf("userId"), updateTravelerLocation);

/* ============================================================
   ⭐ UPDATE TRAVELER (ADDRESS ONLY — IDENTITY LOCKED)
============================================================ */
router.put("/travelers/:id", auth, requireSelfTraveler("id"), async (req, res) => {
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
router.post("/jobs/:jobId/accept", auth, requireRole("traveler"), requireVerified, async (req, res) => {
  try {
    const traveler = await Traveler.findOne({ user: req.user.id });
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
router.post("/jobs/:jobId/complete", auth, requireAssignedTraveler(), completeTravelerJob);

module.exports = router;

