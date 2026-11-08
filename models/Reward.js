// models/Reward.js
// One record per reward earned: first-trip bonus or referral.
// The unique index makes each reward impossible to earn twice.
const mongoose = require("mongoose");

const RewardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["first_trip_bonus", "referral_inviter", "referral_joined"],
      required: true
    },
    amount: { type: Number, required: true },
    // Senders get credit toward deliveries; travelers get cash.
    method: { type: String, enum: ["credit", "cash"], required: true },
    // For referrals: the person who joined.
    relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    delivery: { type: mongoose.Schema.Types.ObjectId, ref: "Delivery", default: null },
    status: {
      type: String,
      enum: ["pending", "credited", "paid", "owed", "failed"],
      default: "pending"
    },
    stripeTransferId: { type: String, default: null },
    error: { type: String, default: null }
  },
  { timestamps: true }
);

RewardSchema.index({ user: 1, type: 1, relatedUser: 1 }, { unique: true });

module.exports = mongoose.model("Reward", RewardSchema);
