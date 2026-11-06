// routes/adminBackground.js
const express = require("express");
const Traveler = require("../models/Traveler");
const adminAuth = require("../middleware/adminAuth");
const router = express.Router();

router.get("/background", adminAuth, async (req, res) => {
  const travelers = await Traveler.find({}, {
    user: 1,
    checkr_candidate_id: 1,
    checkr_report_id: 1,
    background_status: 1,
    background_completed_at: 1,
    createdAt: 1
  }).populate("user", "name email");
  res.json(travelers);
});

module.exports = router;
