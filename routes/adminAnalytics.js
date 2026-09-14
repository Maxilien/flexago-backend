// routes/adminAnalytics.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const Sender = require("../models/Sender");
const Traveler = require("../models/Traveler");
const Order = require("../models/Order");
const mongoose = require("mongoose");

// Helper: parse date range
function getDateRange(query) {
  const now = new Date();
  let start, end;

  if (query.range === "7d") {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    end = now;
  } else if (query.range === "30d") {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    end = now;
  } else if (query.start && query.end) {
    start = new Date(query.start);
    end = new Date(query.end);
  }

  return { start, end };
}

router.get("/", adminAuth, async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query);

    const dateFilter = start && end ? { createdAt: { $gte: start, $lte: end } } : {};

    // Parallel queries
    const [
      senderCount,
      travelerCount,
      orderCount,

      ordersPerDay,
      revenuePerDay,
      revenuePerMonth,
      ordersPerWeek,
      ordersPerHour,

      topTravelers,
      topSenders
    ] = await Promise.all([
      Sender.countDocuments(),
      Traveler.countDocuments(),
      Order.countDocuments(dateFilter),

      // Daily orders
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Daily revenue
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$flexagoFee" }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Monthly revenue
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: "$flexagoFee" }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Weekly analytics
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $isoWeek: "$createdAt" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Hourly analytics
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $hour: "$createdAt" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Top travelers (with name population)
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$travelerId",
            orders: { $sum: 1 },
            revenue: { $sum: "$flexagoFee" }
          }
        },
        { $sort: { orders: -1 } },
        { $limit: 10 }
      ]).then(async (results) => {
        return Promise.all(
          results.map(async (r) => {
            const traveler = await Traveler.findById(r._id).select("name email");
            return { ...r, traveler };
          })
        );
      }),

      // Top senders (with name population)
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$senderId",
            orders: { $sum: 1 },
            revenue: { $sum: "$flexagoFee" }
          }
        },
        { $sort: { orders: -1 } },
        { $limit: 10 }
      ]).then(async (results) => {
        return Promise.all(
          results.map(async (r) => {
            const sender = await Sender.findById(r._id).select("name email");
            return { ...r, sender };
          })
        );
      })
    ]);

    // Chart-ready formatting
    const chartDailyOrders = {
      labels: ordersPerDay.map((d) => d._id),
      datasets: [{ label: "Orders", data: ordersPerDay.map((d) => d.count) }]
    };

    const chartDailyRevenue = {
      labels: revenuePerDay.map((d) => d._id),
      datasets: [{ label: "Revenue", data: revenuePerDay.map((d) => d.revenue) }]
    };

    const chartHourlyOrders = {
      labels: ordersPerHour.map((h) => `${h._id}:00`),
      datasets: [{ label: "Orders", data: ordersPerHour.map((h) => h.count) }]
    };

    res.json({
      senderCount,
      travelerCount,
      orderCount,

      ordersPerDay,
      revenuePerDay,
      revenuePerMonth,
      ordersPerWeek,
      ordersPerHour,

      chartDailyOrders,
      chartDailyRevenue,
      chartHourlyOrders,

      topTravelers,
      topSenders
    });
  } catch (err) {
    console.error("Admin analytics error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
