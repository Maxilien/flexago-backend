// routes/adminDeliveries.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const Delivery = require("../models/Delivery");
const Sender = require("../models/Sender");
const Traveler = require("../models/Traveler");

// GET /api/admin/deliveries
router.get("/", adminAuth, async (req, res) => {
  try {
    // If ID is provided → return full delivery details
    if (req.query.id) {
      const d = await Delivery.findById(req.query.id).lean();

      if (!d) return res.status(404).json({ error: "Delivery not found" });

      // Attach sender + traveler details
      const sender = await Sender.findById(d.senderId).lean();
      const traveler = d.travelerId
        ? await Traveler.findById(d.travelerId).lean()
        : null;

      return res.json({
        ...d,
        sender,
        travelerDetails: traveler
          ? {
              firstName: traveler.firstName,
              lastName: traveler.lastName,
              phone: traveler.phone,
              email: traveler.email
            }
          : null
      });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Filters
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
        { "pickup.address": { $regex: search, $options: "i" } },
        { "dropoff.address": { $regex: search, $options: "i" } },
        { senderId: { $regex: search, $options: "i" } },
        { travelerId: { $regex: search, $options: "i" } },
        { _id: { $regex: search, $options: "i" } }
      ];
    }

    // Fetch deliveries
    const deliveries = await Delivery.find(query)
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach sender + traveler names
    const enriched = await Promise.all(
      deliveries.map(async d => {
        const sender = await Sender.findById(d.senderId).lean();
        const traveler = d.travelerId
          ? await Traveler.findById(d.travelerId).lean()
          : null;

        return {
          ...d,
          sender,
          travelerDetails: traveler
            ? {
                firstName: traveler.firstName,
                lastName: traveler.lastName,
                phone: traveler.phone,
                email: traveler.email
              }
            : null
        };
      })
    );

    res.json({
      page,
      deliveries: enriched
    });

  } catch (err) {
    console.error("Admin deliveries error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
