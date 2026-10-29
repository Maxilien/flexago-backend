// routes/adminUsers.js

const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

const User = require("../models/User");
const Traveler = require("../models/Traveler");

// ============================================================
// ADMIN USERS AND TRAVELERS
// ============================================================

router.get("/", adminAuth, async (req, res) => {
  try {
    const parsedPage = Number.parseInt(req.query.page, 10);
    const page =
      Number.isInteger(parsedPage) && parsedPage > 0
        ? parsedPage
        : 1;

    const limit = 20;
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();

    const userSearchQuery = search
      ? {
          $or: [
            {
              firstName: {
                $regex: search,
                $options: "i"
              }
            },
            {
              lastName: {
                $regex: search,
                $options: "i"
              }
            },
            {
              email: {
                $regex: search,
                $options: "i"
              }
            },
            {
              phone: {
                $regex: search,
                $options: "i"
              }
            }
          ]
        }
      : {};

    const senderQuery = {
      role: "sender",
      ...userSearchQuery
    };

    const [
      senders,
      travelers,
      totalSenders,
      totalTravelers,
      pendingSenderKyc,
      pendingTravelerKyc
    ] = await Promise.all([
      User.find(senderQuery)
        .skip(skip)
        .limit(limit)
        .lean(),

      Traveler.find({})
        .populate("user")
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments({
        role: "sender"
      }),

      Traveler.countDocuments({}),

      User.countDocuments({
        role: "sender",
        kycVerified: {
          $ne: true
        }
      }),

      Traveler.countDocuments({
        verified: {
          $ne: true
        }
      })
    ]);

    const totalUsers =
      totalSenders +
      totalTravelers;

    const kycPending =
      pendingSenderKyc +
      pendingTravelerKyc;

    res.json({
      page,
      limit,
      senders,
      travelers,
      totals: {
        users: totalUsers,
        senders: totalSenders,
        travelers: totalTravelers,
        kycPending
      }
    });
  } catch (err) {
    console.error(
      "Admin users error:",
      err
    );

    res.status(500).json({
      error: "Server error"
    });
  }
});

module.exports = router;
