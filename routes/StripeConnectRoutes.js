//Route/StripeConnectRoutes.js

const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// CREATE CONNECTED ACCOUNT (Traveler)
router.post("/create-connected-account", async (req, res) => {
  try {
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true }
      }
    });

    res.json({ accountId: account.id });

  } catch (err) {
    console.error("Create Connected Account Error:", err);
    res.status(500).json({ error: "Failed to create connected account" });
  }
});
