// models/Sender.js
const mongoose = require("mongoose");

const SenderSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  phone:     { type: String, required: true },
  passwordHash: { type: String, required: true },

  // Optional fields you already use in frontend
  verifiedEmail: { type: Boolean, default: false },
  verifiedPhone: { type: Boolean, default: false },
  verifiedIdentity: { type: Boolean, default: false },
  verifiedPayment: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Sender", SenderSchema);
