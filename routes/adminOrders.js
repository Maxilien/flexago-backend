// routes/adminOrders.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const Order = require("../models/Order");

router.get("/", adminAuth, async (req, res) => {
  try {
    // If orderId is provided → return full order details
    if (req.query.id) {
      const order = await Order.findById(req.query.id).lean();
      return res.json(order);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const status = req.query.status || "";
    const search = req.query.search || "";

    let query = {};

    // Status filter
    if (status) {
      query.status = status;
    }

    // Search filter
    if (search) {
      query.$or = [
        { pickupAddress: { $regex: search, $options: "i" } },
        { dropoffAddress: { $regex: search, $options: "i" } },
        { senderId: { $regex: search, $options: "i" } },
        { travelerId: { $regex: search, $options: "i" } }
      ];
    }

    const orders = await Order.find(query)
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      page,
      orders
    });

  } catch (err) {
    console.error("Admin orders error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
