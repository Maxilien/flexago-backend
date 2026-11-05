// models/OnboardingSession.js
// ------------------------------------------------------
// Server-side record of a signup in progress.
//
// Verified facts live here, never in the browser. An account
// can only be created from a session where the server itself
// confirmed the email, phone and identity check.
// Sessions delete themselves after 24 hours.
// ------------------------------------------------------

const mongoose = require("mongoose");

const OnboardingSessionSchema = new mongoose.Schema(
  {
    // Set when an existing user is re-verifying.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: ["sender", "traveler"], required: true },

    email: { type: String, lowercase: true, trim: true, default: null },
    emailVerifiedAt: { type: Date, default: null },
    emailCodeHash: { type: String, default: null },
    emailCodeExpires: { type: Date, default: null },
    emailAttempts: { type: Number, default: 0 },

    phone: { type: String, trim: true, default: null },
    phoneVerifiedAt: { type: Date, default: null },
    phoneCodeHash: { type: String, default: null },
    phoneCodeExpires: { type: Date, default: null },
    phoneAttempts: { type: Number, default: 0 },

    stripeIdentitySessionId: { type: String, default: null },
    identityStatus: {
      type: String,
      enum: ["not_started", "pending", "verified", "failed", "mismatch"],
      default: "not_started"
    },
    identityVerifiedAt: { type: Date, default: null },
    identityDob: { type: String, default: null }, // YYYY-MM-DD from the ID

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  },
  { timestamps: true }
);

OnboardingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OnboardingSession", OnboardingSessionSchema);
