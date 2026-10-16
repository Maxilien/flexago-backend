/* ============================================================
   DELIVERY CHAT CONTROLLER

   Handles persisted Sender <-> Traveler messages.

   Security note:
   Delivery authorization is handled by deliveryChatAuth
   middleware before these controller methods execute.
============================================================ */

const mongoose = require("mongoose");
const DeliveryMessage = require("../models/DeliveryMessage");

/* ============================================================
   HELPERS
============================================================ */

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function normalizeMessage(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

/* ============================================================
   GET DELIVERY CHAT HISTORY
   GET /api/delivery-chat/:deliveryId
============================================================ */

async function getDeliveryMessages(req, res) {
  try {
    const { deliveryId } = req.params;

    if (!isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid delivery ID."
      });
    }

    const messages = await DeliveryMessage.find({
      deliveryId
    })
      .sort({
        createdAt: 1
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error(
      "Delivery chat history error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to load delivery chat."
    });
  }
}

/* ============================================================
   SEND DELIVERY MESSAGE
   POST /api/delivery-chat/:deliveryId
============================================================ */

async function sendDeliveryMessage(req, res) {
  try {
    const { deliveryId } = req.params;

    if (!isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid delivery ID."
      });
    }

    const text = normalizeMessage(
      req.body?.message
    );

    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Message is required."
      });
    }

    if (text.length > 2000) {
      return res.status(400).json({
        success: false,
        error: "Message cannot exceed 2000 characters."
      });
    }

    /*
     * deliveryChatAuth middleware attaches:
     *
     * req.deliveryChatUser = {
     *   id,
     *   role
     * }
     */

    const chatUser = req.deliveryChatUser;

    if (
      !chatUser ||
      !chatUser.id ||
      !chatUser.role
    ) {
      return res.status(403).json({
        success: false,
        error: "Delivery chat authorization is required."
      });
    }

    if (!isValidObjectId(chatUser.id)) {
      return res.status(403).json({
        success: false,
        error: "Invalid authenticated chat user."
      });
    }

    if (
      chatUser.role !== "sender" &&
      chatUser.role !== "traveler"
    ) {
      return res.status(403).json({
        success: false,
        error: "Invalid delivery chat role."
      });
    }

    const savedMessage =
      await DeliveryMessage.create({
        deliveryId,
        senderId: chatUser.id,
        senderRole: chatUser.role,
        message: text
      });

    return res.status(201).json({
      success: true,
      data: savedMessage
    });
  } catch (error) {
    console.error(
      "Delivery chat send error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to send message."
    });
  }
}

/* ============================================================
   MARK RECEIVED MESSAGES AS READ
   PATCH /api/delivery-chat/:deliveryId/read
============================================================ */

async function markDeliveryMessagesRead(req, res) {
  try {
    const { deliveryId } = req.params;

    if (!isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid delivery ID."
      });
    }

    const chatUser = req.deliveryChatUser;

    if (
      !chatUser ||
      !chatUser.id ||
      !chatUser.role
    ) {
      return res.status(403).json({
        success: false,
        error: "Delivery chat authorization is required."
      });
    }

    if (!isValidObjectId(chatUser.id)) {
      return res.status(403).json({
        success: false,
        error: "Invalid authenticated chat user."
      });
    }

    const result =
      await DeliveryMessage.updateMany(
        {
          deliveryId,
          senderId: {
            $ne: chatUser.id
          },
          read: false
        },
        {
          $set: {
            read: true,
            readAt: new Date()
          }
        }
      );

    return res.status(200).json({
      success: true,
      modifiedCount:
        result.modifiedCount || 0
    });
  } catch (error) {
    console.error(
      "Delivery chat read-status error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to update message read status."
    });
  }
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  getDeliveryMessages,
  sendDeliveryMessage,
  markDeliveryMessagesRead
};