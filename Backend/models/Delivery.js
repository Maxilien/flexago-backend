// models/Delivery.js
import mongoose from "mongoose";

const DeliverySchema = new mongoose.Schema(
  {
    // Sender (embedded)
    sender: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true }
    },

    // Traveler (User)
    traveler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Pickup details (GeoJSON)
    pickup: {
      address: { type: String, required: true },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
          required: true
        },
        coordinates: {
          type: [Number], // [lng, lat]
          required: true
        }
      },
      contactName: String,
      contactPhone: String
    },

    // Dropoff details (GeoJSON)
    dropoff: {
      address: { type: String, required: true },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
          required: true
        },
        coordinates: {
          type: [Number], // [lng, lat]
          required: true
        }
      },
      contactName: String,
      contactPhone: String,
      instructions: String
    },

    // Package details
    package: {
      type: { type: String, required: true }, // envelope, small_box, etc.
      weight: Number,
      insurance: String,
      deliveryType: String,
      description: String,
      declaredValue: Number,
      size: {
        type: String,
        enum: ["small", "medium", "large"]
      }
    },

    // Delivery lifecycle
    status: {
      type: String,
      enum: [
        "created",
        "matched",
        "accepted",
        "pickup_confirmed",
        "in_transit",
        "dropoff_confirmed",
        "delivered",
        "completed",
        "cancelled"
      ],
      default: "created"
    },

    // Cost & payout
    pricing: {
      senderFee: Number,
      travelerEarnings: Number,
      distanceKm: Number
    },

    // Delivery proof
    deliveryPhoto: {
      type: String,
      default: null
    },
    deliverySignature: {
      type: String,
      default: null
    },
    deliverySignedBy: {
      type: String,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    },

    // Timeline
    timestampsLog: {
      createdAt: Date,
      matchedAt: Date,
      acceptedAt: Date,
      pickupConfirmedAt: Date,
      inTransitAt: Date,
      dropoffConfirmedAt: Date,
      completedAt: Date,
      cancelledAt: Date
    },

    // Notes
    notes: String
  },
  { timestamps: true }
);

// Geo indexes
DeliverySchema.index({ "pickup.location": "2dsphere" });
DeliverySchema.index({ "dropoff.location": "2dsphere" });

// Status index
DeliverySchema.index({ status: 1 });

export default mongoose.model("Delivery", DeliverySchema);

