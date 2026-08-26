// Models/delivery.js
// ------------------------------------------------------
// Flexago Delivery Model (CommonJS)
// ------------------------------------------------------

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

const DeliverySchema = new mongoose.Schema(
  {
    sender: {
      name: String,
      phone: String,
      email: String
    },

    senderId: { type: String, required: true },

    receiver: {
      name: String,
      phone: String,
      instructions: String
    },

    pickup: GeoPointSchema,
    dropoff: GeoPointSchema,

    package: PackageSchema,

    price: { type: Number, required: true },
    payoutAmount: { type: Number, required: true },

    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Traveler",
      default: null
    },

    // ⭐ Traveler details (first + last name)
    travelerDetails: {
      firstName: String,
      lastName: String
    },

    // ⭐ NEW — Pickup security fields
    pickupCode: String,                     // 6-digit pickup verification code
    pickupQR: String,                       // optional QR token
    pickupVerified: { type: Boolean, default: false }, // traveler must verify pickup

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

    acceptedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    payoutCompletedAt: Date,

    proofPhoto: String,
    notes: String
  },
  { timestamps: true }
);

DeliverySchema.index({ "pickup.location": "2dsphere" });
DeliverySchema.index({ "dropoff.location": "2dsphere" });

module.exports = mongoose.model("Delivery", DeliverySchema);
