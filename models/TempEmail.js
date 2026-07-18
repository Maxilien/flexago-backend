const mongoose = require("mongoose");

const tempEmailSchema = new mongoose.Schema(
  {
    // Existing fields (email verification)
    email: { type: String, required: true },
    code: { type: String, required: true },
    expires: { type: Number, required: true },

    // ⭐ NEW: Required for Stripe Identity metadata
    userId: {
      type: String,
      required: true,
      unique: true
    },

    // ⭐ NEW: Stripe Identity verification status
    identityVerified: {
      type: Boolean,
      default: false
    },

    // ⭐ NEW: Optional — store Stripe session ID for debugging
    verificationSessionId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("TempEmail", tempEmailSchema);
