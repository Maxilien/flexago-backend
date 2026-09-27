// routes/adminPayouts.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

const Delivery = require("../models/Delivery");
const User = require("../models/User");        // ⭐ FIXED — replace Sender
const Traveler = require("../models/Traveler");

// GET /api/admin/payouts
router.get("/", adminAuth, async (req, res) => {
  try {
    // Find deliveries where payout is completed
    const deliveries = await Delivery.find({ status: "payout_completed" }).lean();

    // Attach sender + traveler details
    const enriched = await Promise.all(
      deliveries.map(async d => {
        // ⭐ Sender is now stored in User model
        const sender = await User.findById(d.senderId).lean();

        // ⭐ Traveler stays the same
        const traveler = d.travelerId
          ? await Traveler.findById(d.travelerId).lean()
          : null;

        return {
          ...d,

          // ⭐ Clean sender object
          sender: sender
            ? {
                firstName: sender.firstName,
                lastName: sender.lastName,
                phone: sender.phone,
                email: sender.email,
                address: sender.address,
                city: sender.city,
                state: sender.state,
                zipcode: sender.zipcode,
                country: sender.country
              }
            : null,

          // ⭐ Clean traveler object
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

    res.json(enriched);

  } catch (err) {
    console.error("Admin payouts error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
