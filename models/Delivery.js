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
    sender: {
      name: String,
      phone: String,
      email: String
    },

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

    travelerId: { type: String, default: null },

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
