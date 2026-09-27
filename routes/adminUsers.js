// routes/adminUsers.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

const User = require("../models/User");
const Traveler = require("../models/Traveler");

// ADMIN — USERS + TRAVELERS
router.get("/", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    const userSearchQuery = search
      ? {
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    // Senders from User model
    const senders = await User.find({ role: "sender", ...userSearchQuery })
      .skip(skip)
      .limit(limit)
      .lean();

    // Travelers with populated user profile
    const travelers = await Traveler.find()
      .populate("user")
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      page,
      senders,
      travelers
    });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

