// routes/adminUsers.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const Sender = require("../models/Sender");
const Traveler = require("../models/Traveler");

router.get("/", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    const senderQuery = search
      ? { $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]}
      : {};

    const travelerQuery = search
      ? { $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]}
      : {};

    const senders = await Sender.find(senderQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    const travelers = await Traveler.find(travelerQuery)
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
