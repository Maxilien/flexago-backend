// models/Order.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  travelerId: { type: String, default: null },

  pickupAddress: { type: String, required: true },
  dropoffAddress: { type: String, required: true },

  status: {
    type: String,
    enum: ["pending", "accepted", "in_transit", "delivered", "cancelled"],
    default: "pending"
  },

  price: { type: Number, required: true },
  flexagoFee: { type: Number, default: 0 },

  escrowStatus: {
    type: String,
    enum: ["pending", "held", "released"],
    default: "pending"
  },

  deliveryPhoto: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null }
});

module.exports = mongoose.model("Order", OrderSchema);
