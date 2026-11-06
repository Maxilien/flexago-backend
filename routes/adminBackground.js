// routes/adminBackground.js
const express = require("express");
const User = require("../models/User");
const adminAuth = require("../middleware/adminAuth");
const router = express.Router();

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
  res.json(users);
});

module.exports = router;
