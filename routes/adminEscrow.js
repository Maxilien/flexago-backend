// routes/adminEscrow.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const Escrow = require("../models/Escrow");

router.get("/", adminAuth, async (req, res) => {
  try {
    const escrow = await Escrow.find({});
    res.json(escrow);
  } catch (err) {
    console.error("Admin escrow error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
