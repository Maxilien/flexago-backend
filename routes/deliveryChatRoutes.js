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