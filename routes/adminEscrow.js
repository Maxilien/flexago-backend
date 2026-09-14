// routes/adminEscrow.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

const Delivery = require("../models/Delivery");
const Sender = require("../models/Sender");
const Traveler = require("../models/Traveler");

// GET /api/admin/escrow
router.get("/", adminAuth, async (req, res) => {
  try {
    // Find deliveries waiting for payout
    const deliveries = await Delivery.find({ status: "payout_pending" }).lean();

    // Attach sender + traveler details
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

    res.json(enriched);

  } catch (err) {
    console.error("Admin escrow error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
