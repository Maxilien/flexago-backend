// models/Admin.js
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },

  phone: { type: String, required: true }, // employee personal number
  twoFACode: String,
  twoFAExpires: Date,

  role: { type: String, default: "admin" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Admin", adminSchema);
