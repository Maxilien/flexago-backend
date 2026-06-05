// models/Traveler.js
// ------------------------------------------------------
// Flexagoo Traveler Schema (CommonJS)
// Real-time location, route matching, compliance-ready
// ------------------------------------------------------

const mongoose = require("mongoose");

const TravelerSchema = new mongoose.Schema(
  {
    // Link to User account
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Vehicle information
    vehicle: {
      type: {
        make: String,
        model: String,
        year: Number,
        color: String,
        plateNumber: String,
      },
      required: false,
    },

    // Real-time location (GeoJSON)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
      updatedAt: { type: Date },
    },

    // Availability status
    status: {
      type: String,
      enum: ["offline", "online", "on_delivery"],
      default: "offline",
    },

    // Route preferences (optional)
    preferredRoutes: [
      {
        from: String,
        to: String,
        country: String,
      },
    ],

    // Performance metrics
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },

    totalDeliveries: {
      type: Number,
      default: 0,
    },

    // Verification
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ------------------------------------------------------
// Geo Index for Real-Time Location Queries
// ------------------------------------------------------
TravelerSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Traveler", TravelerSchema);

