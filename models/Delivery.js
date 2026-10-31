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

travelerDetails: {
  firstName: {
    type: String,
    default: ""
  },

  lastName: {
    type: String,
    default: ""
  },

  rating: {
    type: Number,
    default: 5
  },

  totalDeliveries: {
    type: Number,
    default: 0
  }
},

    pickupCode: String,
    pickupQR: String,
    pickupVerified: { type: Boolean, default: false },

status: {
  type: String,
  enum: [
    "created",
    "payment_pending",
    "payment_failed",
    "available",
    "accepted",
    "in_transit",
    "delivered",
    "payout_pending",
    "payout_completed"
  ],
  default: "payment_pending"
},
    acceptedAt: Date,
pickedUpAt: Date,
deliveredAt: Date,
payoutCompletedAt: Date,

/* ============================================================
   PAYMENT LIFECYCLE
============================================================ */

paymentStatus: {
  type: String,
  enum: [
    "pending",
    "requires_payment",
    "paid",
    "failed",
    "refunded"
  ],
  default: "pending"
},

payoutStatus: {
  type: String,
  enum: [
    "pending",
    "processing",
    "transferred",
    "external_payout_pending",
    "external_payout_in_transit",
    "completed",
    "failed"
  ],
  default: "pending"
},
amountCharged: {
  type: Number,
  default: 0
},

currency: {
  type: String,
  default: "usd"
},

fundedAt: {
  type: Date,
  default: null
},

paymentFailedAt: {
  type: Date,
  default: null
},

transferredAt: {
  type: Date,
  default: null
},

externalPayoutPaidAt: {
  type: Date,
  default: null
},

payoutFailedAt: {
  type: Date,
  default: null
},

/* ============================================================
   STRIPE TRACKING
============================================================ */

stripePaymentIntentId: {
  type: String,
  default: null
},

stripeChargeId: {
  type: String,
  default: null
},

stripeTransferId: {
  type: String,
  default: null
},

stripePayoutId: {
  type: String,
  default: null
},

transferGroup: {
  type: String,
  default: null
},

/* ============================================================
   PROOF OF DELIVERY
============================================================ */

proofPhoto: {
  type: String,
  default: null
},

signedBy: {
  type: String,
  default: null
},

signatureUrl: {
  type: String,
  default: null
},

completedAt: {
  type: Date,
  default: null
},

notes: String
  },
  { timestamps: true }
);

DeliverySchema.index({ "pickup.location": "2dsphere" });
DeliverySchema.index({ "dropoff.location": "2dsphere" });

module.exports = mongoose.model("Delivery", DeliverySchema);
