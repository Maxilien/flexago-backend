// routes/adminBackground.js
const express = require("express");
const User = require("../models/User");
const adminAuth = require("../middleware/adminAuth");
const router = express.Router();

// The Checkr dashboard that matches the API the server talks to.
function checkrDashboard() {
  const api = process.env.CHECKR_BASE_URL || "https://api.checkr.com/v1";
  return /staging/.test(api)
    ? "https://dashboard.checkrhq-staging.net"
    : "https://dashboard.checkr.com";
}

router.get("/background", adminAuth, async (req, res) => {
  const users = await User.find({}, {
    firstName: 1,
    lastName: 1,
    email: 1,
    role: 1,
    checkr_candidate_id: 1,
    checkr_report_id: 1,
    background_status: 1,
    background_completed_at: 1,
    createdAt: 1
  }).lean();

  const dashboard = checkrDashboard();

  // Adjudicators open the full report in Checkr; it is never copied here.
  res.json(users.map((u) => ({
    ...u,
    checkr_url: u.checkr_candidate_id
      ? `${dashboard}/candidates/${encodeURIComponent(u.checkr_candidate_id)}`
      : null
  })));
});

module.exports = router;
