// routes/adminRevenue.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

const Delivery = require("../models/Delivery");

// GET /api/admin/revenue
router.get("/", adminAuth, async (req, res) => {
  try {
    const deliveries = await Delivery.find({}).lean();

    let totalRevenue = 0;
    let totalPayouts = 0;

    deliveries.forEach(d => {
      totalRevenue += d.price || 0;
      totalPayouts += d.payoutAmount || 0;
    });

    const flexagoFee = totalRevenue - totalPayouts;

    res.json({
      totalRevenue,
      totalPayouts,
      flexagoFee,
      deliveryCount: deliveries.length
    });

  } catch (err) {
    console.error("Admin revenue error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
