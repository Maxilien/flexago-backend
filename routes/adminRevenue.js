// routes/adminRevenue.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const Order = require("../models/Order");

router.get("/", adminAuth, async (req, res) => {
  try {
    const orders = await Order.find({});
    let totalRevenue = 0;

    orders.forEach(order => {
      totalRevenue += order.flexagoFee || 0;
    });

    res.json({ totalRevenue });
  } catch (err) {
    console.error("Admin revenue error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
