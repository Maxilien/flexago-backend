///routes/admin.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

const Sender = require("../models/Sender");
const Traveler = require("../models/Traveler");
const Delivery = require("../models/Delivery");
const Escrow = require("../models/Escrow");
const Payout = require("../models/Payout");

// USERS TAB
router.get("/users", adminAuth, async (req, res) => {
  try {
    const senders = await Sender.find({});
    const travelers = await Traveler.find({});
    res.json({ senders, travelers });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// DELIVERIES TAB
router.get("/deliveries", adminAuth, async (req, res) => {
  try {
    const deliveries = await Delivery.find({});
    res.json({ deliveries });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ESCROW TAB
router.get("/escrow", adminAuth, async (req, res) => {
  try {
    const escrows = await Escrow.find({});
    res.json(escrows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// PAYOUTS TAB
router.get("/payouts", adminAuth, async (req, res) => {
  try {
    const payouts = await Payout.find({});
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// REVENUE TAB
router.get("/revenue", adminAuth, async (req, res) => {
  try {
    const deliveries = await Delivery.find({});
    const totalRevenue = deliveries.reduce((sum, d) => sum + (d.price || 0), 0);
    const totalPayouts = deliveries.reduce((sum, d) => sum + (d.payoutAmount || 0), 0);
    const flexagoFee = totalRevenue - totalPayouts;

    res.json({ totalRevenue, totalPayouts, flexagoFee });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ANALYTICS TAB
router.get("/analytics", adminAuth, async (req, res) => {
  try {
    const senderCount = await Sender.countDocuments();
    const travelerCount = await Traveler.countDocuments();
    const orderCount = await Delivery.countDocuments();

    res.json({
      senderCount,
      travelerCount,
      orderCount,
      chartDailyOrders: { labels: [], datasets: [{ data: [] }] },
      chartDailyRevenue: { labels: [], datasets: [{ data: [] }] },
      chartHourlyOrders: { labels: [], datasets: [{ data: [] }] },
      ordersPerWeek: []
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
