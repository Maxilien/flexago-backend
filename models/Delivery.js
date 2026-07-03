// model/modeldelivery.js
// ------------------------------------------------------
// Flexago Delivery model (CommonJS)
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
  declaredValue: Number
});

const DeliverySchema = new mongoose.Schema(
  {
    sender: { ... },
    receiver: { ... },

    pickup: GeoPointSchema,
    dropoff: GeoPointSchema,

    package: PackageSchema,

    price: Number,
    payoutAmount: Number,

    traveler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Traveler",
      default: null
    },

    travelerDetail: {
      firstName: String,
      lastName: String,
      email: String
    },

    status: {
      type: String,
      enum: [
        "created",
        "available",
        "accepted",
        "picked_up",
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

    // ⭐ NEW — Nested Proof of Delivery object
    proofOfDelivery: {
      receiverName: { type: String, default: null },
      photoUrl: { type: String, default: null },
      signatureUrl: { type: String, default: null },
      deliveredAt: { type: Date, default: null },
      deliveredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Traveler",
        default: null
      }
    },

    notes: String
  },
  { timestamps: true }
);

DeliverySchema.index({ "pickup.location": "2dsphere" });
DeliverySchema.index({ "dropoff.location": "2dsphere" });

module.exports = mongoose.model("Delivery", DeliverySchema);
