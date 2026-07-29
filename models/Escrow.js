// models/Escrow.js
const mongoose = require("mongoose");

const EscrowSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  senderId: { type: String, required: true },
  travelerId: { type: String, default: null },

  amount: { type: Number, required: true },

  status: {
    type: String,
    enum: ["pending", "held", "released"],
    default: "pending"
  },

  createdAt: { type: Date, default: Date.now },
  releasedAt: { type: Date, default: null }
});

module.exports = mongoose.model("Escrow", EscrowSchema);
