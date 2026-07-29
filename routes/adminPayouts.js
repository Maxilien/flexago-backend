// routes/adminPayouts.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const Payout = require("../models/Payout");

router.get("/", adminAuth, async (req, res) => {
  try {
    const payouts = await Payout.find({});
    res.json(payouts);
  } catch (err) {
    console.error("Admin payouts error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
