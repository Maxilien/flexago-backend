// routes/adminEscrow.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

const Delivery = require("../models/Delivery");
const User = require("../models/User");        // ⭐ FIXED — replace Sender
const Traveler = require("../models/Traveler");

// GET /api/admin/escrow
router.get("/", adminAuth, async (req, res) => {
  try {
    // Find deliveries waiting for payout
    const deliveries = await Delivery.find({ status: "payout_pending" }).lean();

   // Build clean Escrow rows from payout-pending deliveries
    const enriched = await Promise.all(
      deliveries.map(async delivery => {
        const sender =
          await User.findById(
            delivery.senderId
          )
            .select(
              "firstName lastName email"
            )
            .lean();

        const traveler =
          delivery.travelerId
            ? await Traveler.findById(
                delivery.travelerId
              )
                .populate(
                  "user",
                  "firstName lastName email"
                )
                .lean()
            : null;

        const senderName = sender
          ? `${sender.firstName || ""} ${sender.lastName || ""}`.trim()
          : "";

        const travelerUser =
          traveler?.user || null;

        const travelerName =
          travelerUser
            ? `${travelerUser.firstName || ""} ${travelerUser.lastName || ""}`.trim()
            : "";

        const deliveryPrice =
          Number(delivery.price) || 0;

        const travelerPayout =
          Number(delivery.payoutAmount) || 0;

        return {
          deliveryId: delivery._id,
          senderName:
            senderName || "Unknown Sender",
          senderEmail:
            sender?.email || "",
          travelerName:
            travelerName || "Unassigned",
          travelerEmail:
            travelerUser?.email || "",
          deliveryPrice,
          travelerPayout,
          flexagoFee:
            deliveryPrice -
            travelerPayout,
          status:
            delivery.status ||
            "payout_pending",
          createdAt:
            delivery.createdAt || null
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

