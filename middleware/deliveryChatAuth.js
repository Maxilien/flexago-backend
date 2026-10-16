/* ============================================================
   DELIVERY CHAT AUTHORIZATION MIDDLEWARE

   Authorizes Sender <-> Traveler chat access for one delivery.

   Current authentication architecture:
   - The frontend sends the logged-in user ID and role in headers.
   - This middleware verifies that the user belongs to the delivery.

   Required headers:
   x-user-id
   x-user-role
============================================================ */

const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");

/* ============================================================
   HELPERS
============================================================ */

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function normalizeRole(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

/* ============================================================
   DELIVERY CHAT AUTHORIZATION
============================================================ */

async function deliveryChatAuth(req, res, next) {
  try {
    const { deliveryId } = req.params;

    if (!deliveryId || !isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid delivery ID."
      });
    }

    const userId = String(
      req.headers["x-user-id"] || ""
    ).trim();

    const requestedRole = normalizeRole(
      req.headers["x-user-role"]
    );

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User authentication is required."
      });
    }

    if (!isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        error: "Invalid authenticated user ID."
      });
    }

    if (
      requestedRole !== "sender" &&
      requestedRole !== "traveler"
    ) {
      return res.status(401).json({
        success: false,
        error: "A valid user role is required."
      });
    }

    const delivery = await Delivery.findById(deliveryId)
      .select("senderId travelerId status")
      .lean();

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: "Delivery not found."
      });
    }

    const deliverySenderId = delivery.senderId
      ? String(delivery.senderId)
      : "";

    const deliveryTravelerId = delivery.travelerId
      ? String(delivery.travelerId)
      : "";

    let authorizedRole = null;

    if (
      requestedRole === "sender" &&
      deliverySenderId === userId
    ) {
      authorizedRole = "sender";
    }

    if (
      requestedRole === "traveler" &&
      deliveryTravelerId === userId
    ) {
      authorizedRole = "traveler";
    }

    if (!authorizedRole) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to access this delivery chat."
      });
    }

    /* ========================================================
       ATTACH AUTHORIZED CHAT USER
    ======================================================== */

    req.deliveryChatUser = {
      id: userId,
      role: authorizedRole
    };

    /* ========================================================
       ATTACH DELIVERY
    ======================================================== */

    req.deliveryChatDelivery = delivery;

    next();

  } catch (error) {
    console.error(
      "Delivery chat authorization error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to authorize delivery chat."
    });
  }
}

/* ============================================================
   EXPORT
============================================================ */

module.exports = deliveryChatAuth;