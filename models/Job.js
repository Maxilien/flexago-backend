// models/Job.js
const mongoose = require("mongoose");

const GeoPointSchema = new mongoose.Schema({
  address: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },
  contactName: String,
  contactPhone: String,
  instructions: String
});

const PackageSchema = new mongoose.Schema({
  type: String,
  weight: Number,
  size: String,
  insurance: Boolean,
  deliveryType: String,
  description: String,
  declaredValue: Number,
  photoUrl: { type: String, default: null }
});

const JobSchema = new mongoose.Schema(
  {
    // -----------------------------
    // SENDER
    // -----------------------------
    senderId: { type: String, required: true },
    sender: {
      name: String,
      phone: String,
      email: String
    },

    // -----------------------------
    // RECEIVER
    // -----------------------------
    receiver: {
      name: String,
      phone: String,
      instructions: String
    },

    // -----------------------------
    // LOCATIONS
    // -----------------------------
    pickup: GeoPointSchema,
    dropoff: GeoPointSchema,

    // -----------------------------
    // PACKAGE
    // -----------------------------
    package: PackageSchema,

    // -----------------------------
    // PRICING
    // -----------------------------
    price: { type: Number, required: true },        // sender pays
    payoutAmount: { type: Number, required: true }, // traveler receives

    // -----------------------------
    // TRAVELER
    // -----------------------------
    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Traveler",
      default: null
    },

    travelerDetails: {
      firstName: String,
      lastName: String
    },

    // -----------------------------
    // PICKUP VERIFICATION
    // -----------------------------
    pickupCode: String,
    pickupQR: String,
    pickupVerified: { type: Boolean, default: false },

    // -----------------------------
    // JOB STATUS
    // -----------------------------
    status: {
      type: String,
      enum: [
        "created",
        "available",
        "accepted",
        "in_transit",
        "delivered",
        "payout_pending",
        "payout_completed"
      ],
      default: "available"
    },

    // -----------------------------
    // PAYMENT + ESCROW
    // -----------------------------
    paymentIntentId: { type: String, default: null },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "released"],
      default: "unpaid"
    },

    escrowStatus: {
      type: String,
      enum: ["none", "held", "released"],
      default: "none"
    },

    // -----------------------------
    // TIMESTAMPS
    // -----------------------------
    acceptedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    payoutCompletedAt: Date,

    // -----------------------------
    // PROOF OF DELIVERY
    // -----------------------------
    proofPhoto: String,

    // -----------------------------
    // NOTES
    // -----------------------------
    notes: String
  },
  { timestamps: true }
);

JobSchema.index({ "pickup.location": "2dsphere" });
JobSchema.index({ "dropoff.location": "2dsphere" });

module.exports = mongoose.model("Job", JobSchema);
