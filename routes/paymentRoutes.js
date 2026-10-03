// routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const Delivery = require("../models/Delivery");
const Traveler = require("../models/Traveler");
const Payout = require("../models/Payout");

// ------------------------------------------------------
// ⭐ AUTOMATIC INSTANT PAYOUT WHEN DELIVERY IS COMPLETED
// ------------------------------------------------------
router.post("/auto-payout", async (req, res) => {
  try {
    const { deliveryId } = req.body;

    if (!deliveryId) {
      return res.status(400).json({ error: "deliveryId is required" });
    }

    // 1. Load delivery
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ error: "Delivery not found" });
    }

    if (delivery.status !== "delivered") {
      return res.status(400).json({ error: "Delivery is not completed yet" });
    }

    // 2. Load traveler
    const traveler = await Traveler.findById(delivery.travelerId);
    if (!traveler) {
      return res.status(404).json({ error: "Traveler not found" });
    }

    if (!traveler.stripeAccountId) {
      return res.status(400).json({ error: "Traveler has no Stripe account" });
    }

    // 3. Calculate payout split (80% traveler / 20% Flexago)
    const total = delivery.price;
    const travelerAmount = Math.round(total * 0.80 * 100); // cents
    const flexagoAmount = Math.round(total * 0.20 * 100);  // cents

    // 4. Transfer 80% to traveler (Instant Payout enabled)
    const travelerTransfer = await stripe.transfers.create({
      amount: travelerAmount,
      currency: "usd",
      destination: traveler.stripeAccountId,
      description: `Flexago delivery payout for ${deliveryId}`
    });

    // 5. Transfer 20% to Flexago (platform fee)
    const flexagoTransfer = await stripe.transfers.create({
      amount: flexagoAmount,
      currency: "usd",
      destination: process.env.FLEXAGO_STRIPE_ACCOUNT_ID,
      description: `Flexago fee for delivery ${deliveryId}`
    });

    // 6. Create payout record
    const payoutRecord = await Payout.create({
      orderId: deliveryId,
      travelerId: traveler._id,
      amount: travelerAmount / 100,
      status: "paid",
      method: "bank",
      stripePayoutId: travelerTransfer.id,
      paidAt: new Date()
    });

    // 7. Update delivery status
    delivery.status = "payout_completed";
    delivery.payoutCompletedAt = new Date();
    delivery.stripeTransferId = travelerTransfer.id;
    await delivery.save();

    // 8. Update traveler earnings
    traveler.totalDeliveries += 1;
    await traveler.save();

    res.json({
      success: true,
      message: "Instant payout completed successfully",
      travelerTransfer,
      flexagoTransfer,
      payoutRecord
    });

  } catch (err) {
    console.error("❌ Auto payout error:", err);
    res.status(500).json({ error: "Auto payout failed" });
  }
});

module.exports = router;

