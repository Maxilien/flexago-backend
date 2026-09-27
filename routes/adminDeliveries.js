// routes/adminDeliveries.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const Delivery = require("../models/Delivery");
const User = require("../models/User");
const Traveler = require("../models/Traveler");

// GET /api/admin/deliveries
router.get("/", adminAuth, async (req, res) => {
  try {
    // Single delivery details
    if (req.query.id) {
      const d = await Delivery.findById(req.query.id).lean();
      if (!d) return res.status(404).json({ error: "Delivery not found" });

      const sender = d.senderId
        ? await User.findById(d.senderId).lean()
        : null;

      const travelerDoc = d.travelerId
        ? await Traveler.findById(d.travelerId).populate("user").lean()
        : null;

      const travelerDetails = travelerDoc
        ? {
            firstName: travelerDoc.user?.firstName || travelerDoc.firstName,
            lastName: travelerDoc.user?.lastName || travelerDoc.lastName,
            phone: travelerDoc.user?.phone || travelerDoc.phone,
            email: travelerDoc.user?.email || travelerDoc.email
          }
        : null;

      return res.json({
        ...d,
        sender,
        travelerDetails
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

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { "pickup.address": { $regex: search, $options: "i" } },
        { "dropoff.address": { $regex: search, $options: "i" } },
        { senderId: { $regex: search, $options: "i" } },
        { travelerId: { $regex: search, $options: "i" } },
        { _id: { $regex: search, $options: "i" } }
      ];
    }

    const deliveries = await Delivery.find(query)
      .skip(skip)
      .limit(limit)
      .lean();

    const enriched = await Promise.all(
      deliveries.map(async d => {
        const sender = d.senderId
          ? await User.findById(d.senderId).lean()
          : null;

        const travelerDoc = d.travelerId
          ? await Traveler.findById(d.travelerId).populate("user").lean()
          : null;

        const travelerDetails = travelerDoc
          ? {
              firstName: travelerDoc.user?.firstName || travelerDoc.firstName,
              lastName: travelerDoc.user?.lastName || travelerDoc.lastName,
              phone: travelerDoc.user?.phone || travelerDoc.phone,
              email: travelerDoc.user?.email || travelerDoc.email
            }
          : null;

        return {
          ...d,
          sender,
          travelerDetails
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
