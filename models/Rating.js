/* ============================================================
   FLEXAGO DELIVERY RATING MODEL

   Stores one Sender rating for the Traveler assigned to a
   completed delivery.

   Security and integrity:
   - The controller must verify the Sender owns the delivery.
   - The controller must obtain travelerId from the delivery.
   - One rating is allowed per delivery.
   - Score must be between 1 and 5.
============================================================ */

const mongoose = require("mongoose");

/* ============================================================
   RATING SCHEMA
============================================================ */

const ratingSchema =
  new mongoose.Schema(
    {
      /* ======================================================
         DELIVERY
      ====================================================== */

      deliveryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Delivery",
        required: true,
        index: true
      },

      /* ======================================================
         RATING AUTHOR

         Delivery.senderId is currently stored as a String,
         so senderId remains a String here for compatibility.
      ====================================================== */

      senderId: {
        type: String,
        required: true,
        trim: true,
        index: true
      },

      /* ======================================================
         RATED TRAVELER
      ====================================================== */

      travelerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Traveler",
        required: true,
        index: true
      },

      /* ======================================================
         RATING SCORE
      ====================================================== */

      score: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
          validator(value) {
            return (
              Number.isInteger(value) &&
              value >= 1 &&
              value <= 5
            );
          },

          message:
            "Rating score must be a whole number between 1 and 5."
        }
      },

      /* ======================================================
         OPTIONAL REVIEW
      ====================================================== */

      review: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ""
      }
    },

    {
      timestamps: true
    }
  );

/* ============================================================
   DUPLICATE RATING PROTECTION

   A delivery can only receive one Sender-to-Traveler rating.

   This database-level index protects against:
   - repeated button clicks
   - duplicate requests
   - simultaneous submissions
============================================================ */

ratingSchema.index(
  {
    deliveryId: 1
  },
  {
    unique: true,
    name:
      "unique_rating_per_delivery"
  }
);

/* ============================================================
   TRAVELER RATING HISTORY INDEX

   Optimizes:
   - average score calculation
   - rating count calculation
   - Traveler review history
============================================================ */

ratingSchema.index(
  {
    travelerId: 1,
    createdAt: -1
  },
  {
    name:
      "traveler_rating_history"
  }
);

/* ============================================================
   SENDER RATING HISTORY INDEX

   Optimizes retrieving ratings submitted by one Sender.
============================================================ */

ratingSchema.index(
  {
    senderId: 1,
    createdAt: -1
  },
  {
    name:
      "sender_rating_history"
  }
);

/* ============================================================
   MODEL
============================================================ */

const Rating =
  mongoose.model(
    "Rating",
    ratingSchema
  );

module.exports =
  Rating;