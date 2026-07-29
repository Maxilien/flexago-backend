// routes/adminAnalytics.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const Sender = require("../models/Sender");
const Traveler = require("../models/Traveler");
const Order = require("../models/Order");

router.get("/", adminAuth, async (req, res) => {
  try {
    const senderCount = await Sender.countDocuments();
    const travelerCount = await Traveler.countDocuments();
    const orderCount = await Order.countDocuments();

    // Orders per day
    const ordersPerDay = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Revenue per day
    const revenuePerDay = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$flexagoFee" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      senderCount,
      travelerCount,
      orderCount,
      ordersPerDay,
      revenuePerDay
    });
  } catch (err) {
    console.error("Admin analytics error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
