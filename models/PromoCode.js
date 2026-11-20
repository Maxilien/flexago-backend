// models/PromoCode.js
// Codes the team creates in the admin dashboard, e.g. UTAUSTIN.
// Each code takes a fixed dollar amount off a sender's delivery.
const mongoose = require("mongoose");

const PromoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z0-9]{3,20}$/
    },
    amount: { type: Number, required: true, min: 1, max: 100 },
    description: { type: String, default: "", maxlength: 200 },
    firstOrderOnly: { type: Boolean, default: true },
    // Empty means unlimited.
    maxUses: { type: Number, default: null, min: 1 },
    uses: { type: Number, default: 0 },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    createdBy: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PromoCode", PromoCodeSchema);
