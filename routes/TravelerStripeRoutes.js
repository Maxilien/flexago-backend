// Route/TravelerStripeRoutes.js
// ------------------------------------------------------
// Save Traveler Stripe Connected Account ID
// ------------------------------------------------------

const express = require("express");
const router = express.Router();
const Traveler = require("../models/Traveler");

// SAVE TRAVELER STRIPE ACCOUNT ID
router.post("/save-stripe-account", async (req, res) => {
  try {
    const { travelerId, accountId } = req.body;

    // Validate input
    if (!travelerId || !accountId) {
      return res.status(400).json({
        error: "Missing travelerId or accountId",
      });
    }

    // Find traveler
    const traveler = await Traveler.findById(travelerId);

    if (!traveler) {
      return res.status(404).json({
        error: "Traveler not found",
      });
    }

    // Save Stripe account ID
    traveler.stripeAccountId = accountId;
    await traveler.save();

    res.json({
      success: true,
      traveler,
    });

  } catch (err) {
    console.error("Save Stripe Account Error:", err);
    res.status(500).json({
      error: "Failed to save Stripe account ID",
    });
  }
});

module.exports = router;
