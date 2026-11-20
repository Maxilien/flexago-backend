/* ============================================================
   DELIVERY CHAT ROUTES

   Handles Sender <-> Traveler delivery chat endpoints.

   Routes:
   GET   /:deliveryId
   POST  /:deliveryId
   PATCH /:deliveryId/read

   Authorization:
   deliveryChatAuth verifies that the requesting user is either
   the Sender or Traveler assigned to the delivery.
============================================================ */

const express = require("express");
const Traveler = require("../models/Traveler");
const UserBlock = require("../models/UserBlock");
const auth = require("../middleware/auth");

const {
  getDeliveryMessages,
  sendDeliveryMessage,
  markDeliveryMessagesRead
} = require("../controllers/deliveryChatController");

const deliveryChatAuth = require(
  "../middleware/deliveryChatAuth"
);

const router = express.Router();

async function rejectBlockedChat(req, res, next) {
  try {
    const { senderId, travelerId } = req.deliveryChatDelivery;
    const traveler = await Traveler.findById(travelerId).select("user").lean();

    if (traveler && await UserBlock.between(senderId, traveler.user)) {
      return res.status(403).json({
        success: false,
        error: "You can't message this person."
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/* ============================================================
   GET DELIVERY CHAT HISTORY
============================================================ */

router.get(
  "/:deliveryId",
  auth,
  deliveryChatAuth,
  getDeliveryMessages
);

/* ============================================================
   SEND DELIVERY MESSAGE
============================================================ */

router.post(
  "/:deliveryId",
  auth,
  deliveryChatAuth,
  rejectBlockedChat,
  sendDeliveryMessage
);

/* ============================================================
   MARK DELIVERY MESSAGES AS READ
============================================================ */

router.patch(
  "/:deliveryId/read",
  auth,
  deliveryChatAuth,
  markDeliveryMessagesRead
);

/* ============================================================
   EXPORT
============================================================ */

module.exports = router;