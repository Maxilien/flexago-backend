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

    // Build clean Payout rows from completed deliveries
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

        return {
          deliveryId:
            delivery._id,

          senderName:
            senderName || "Unknown Sender",

          senderEmail:
            sender?.email || "",

          travelerName:
            travelerName || "Unknown Traveler",

          travelerEmail:
            travelerUser?.email || "",

          payoutAmount:
            Number(delivery.payoutAmount) || 0,

          status:
            delivery.payoutStatus ||
            delivery.status ||
            "completed",

          completedAt:
            delivery.completedAt ||
            delivery.updatedAt ||
            null
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

