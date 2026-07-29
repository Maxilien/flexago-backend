// models/Payout.js
const mongoose = require("mongoose");

const PayoutSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  travelerId: { type: String, required: true },

  amount: { type: Number, required: true },

  status: {
    type: String,
    enum: ["pending", "processing", "paid", "failed"],
    default: "pending"
  },

  method: {
    type: String,
    enum: ["bank", "card"],
    default: "bank"
  },

  stripePayoutId: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
  paidAt: { type: Date, default: null }
});

module.exports = mongoose.model("Payout", PayoutSchema);
