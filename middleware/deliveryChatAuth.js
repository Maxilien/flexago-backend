/* ============================================================
   DELIVERY CHAT AUTHORIZATION MIDDLEWARE

   Authorizes Sender <-> Traveler chat access for one delivery.

   Runs after middleware/auth.js, so identity comes from the
   verified login token.
============================================================ */

const mongoose = require("mongoose");
const { getDeliveryAccess } = require("./access");

/* ============================================================
   HELPERS
============================================================ */

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
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

    const access = await getDeliveryAccess(deliveryId, req.user.id);

    if (!access.found) {
      return res.status(404).json({
        success: false,
        error: "Delivery not found."
      });
    }

    if (!access.role) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to access this delivery chat."
      });
    }

    const { delivery } = access;
    const userId = access.participantId;
    const authorizedRole = access.role;

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