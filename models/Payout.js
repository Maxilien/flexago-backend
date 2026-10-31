// models/Payout.js
const mongoose = require("mongoose");

const PayoutSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true
  },

  travelerId: {
    type: String,
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "transferred",
      "external_payout_pending",
      "external_payout_in_transit",
      "paid",
      "failed"
    ],
    default: "pending"
  },

  method: {
    type: String,
    enum: [
      "bank",
      "card"
    ],
    default: "bank"
  },

  // Flexago platform -> traveler connected Stripe account
  stripeTransferId: {
    type: String,
    default: null
  },

  // Traveler connected Stripe account -> external bank/card
  stripePayoutId: {
    type: String,
    default: null
  },

  transferredAt: {
    type: Date,
    default: null
  },

  paidAt: {
    type: Date,
    default: null
  },

  failedAt: {
    type: Date,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports =
  mongoose.model(
    "Payout",
    PayoutSchema
  );