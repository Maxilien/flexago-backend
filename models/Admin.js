// models/Admin.js
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },

  // Your DB uses "password", not "passwordHash"
  password: { type: String, required: true },

  // 2FA fields
  twoFACode: { type: String, default: null },
  twoFAExpires: { type: Number, default: null },

  role: { type: String, default: "superadmin" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Admin", adminSchema);
