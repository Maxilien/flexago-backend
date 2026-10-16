/* ============================================================
   DELIVERY MESSAGE MODEL

   Stores Sender <-> Traveler messages for a specific delivery.

   One message belongs to:
   - one delivery
   - one sender
   - one participant role

   The delivery itself determines which Sender and Traveler
   are authorized to access the conversation.
============================================================ */

const mongoose = require("mongoose");

const deliveryMessageSchema =
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
         MESSAGE SENDER
      ====================================================== */

      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
      },

      senderRole: {
        type: String,
        enum: [
          "sender",
          "traveler"
        ],
        required: true
      },

      /* ======================================================
         MESSAGE CONTENT
      ====================================================== */

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
      },

      /* ======================================================
         READ STATUS
      ====================================================== */

      read: {
        type: Boolean,
        default: false
      },

      readAt: {
        type: Date,
        default: null
      }
    },

    {
      timestamps: true
    }
  );

/* ============================================================
   CONVERSATION HISTORY INDEX

   Optimizes retrieving messages for one delivery
   in chronological order.
============================================================ */

deliveryMessageSchema.index(
  {
    deliveryId: 1,
    createdAt: 1
  }
);

/* ============================================================
   MODEL
============================================================ */

const DeliveryMessage =
  mongoose.model(
    "DeliveryMessage",
    deliveryMessageSchema
  );

module.exports =
  DeliveryMessage;