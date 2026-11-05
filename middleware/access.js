// middleware/access.js
// ------------------------------------------------------
// Ownership and role checks. Use after middleware/auth.js.
// Identity always comes from the verified login token,
// never from the request body or custom headers.
// ------------------------------------------------------

const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const Traveler = require("../models/Traveler");

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: "This account cannot perform that action."
      });
    }

    return next();
  };
}

// Accounts from before strict onboarding must re-verify first.
function requireVerified(req, res, next) {
  const user = req.user?.user;

  if (user?.emailVerified && user?.phoneVerified && user?.identityVerified) {
    return next();
  }

  return res.status(403).json({
    success: false,
    code: "VERIFICATION_REQUIRED",
    error: "Please finish verifying your account."
  });
}

// The :param in the URL must be the logged-in user's own ID.
function requireSelf(param = "id") {
  return (req, res, next) => {
    if (String(req.params[param]) !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: "You can only access your own account."
      });
    }

    return next();
  };
}

// The :param may be the user's ID or their Traveler profile ID.
function requireSelfTraveler(param = "travelerId") {
  return async (req, res, next) => {
    try {
      const value = String(req.params[param]);

      if (value === req.user?.id) return next();

      const traveler = await Traveler.findOne({ user: req.user.id })
        .select("_id")
        .lean();

      if (traveler && String(traveler._id) === value) return next();

      return res.status(403).json({
        success: false,
        error: "You can only access your own account."
      });
    } catch (error) {
      return next(error);
    }
  };
}

// Only the traveler assigned to :jobId may act on it.
function requireAssignedTraveler(param = "jobId") {
  return async (req, res, next) => {
    try {
      const jobId = req.params[param];

      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({ success: false, error: "Invalid job ID." });
      }

      const [job, traveler] = await Promise.all([
        Delivery.findById(jobId).select("travelerId").lean(),
        Traveler.findOne({ user: req.user.id }).select("_id").lean()
      ]);

      if (!job) {
        return res.status(404).json({ success: false, error: "Job not found" });
      }

      if (!traveler || String(job.travelerId) !== String(traveler._id)) {
        return res.status(403).json({
          success: false,
          error: "This job is not assigned to you."
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

// Sender or assigned traveler of :param.
function requireDeliveryParticipant(param = "deliveryId") {
  return async (req, res, next) => {
    try {
      const deliveryId = req.params[param];

      if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
        return res.status(400).json({ success: false, error: "Invalid delivery ID." });
      }

      const access = await getDeliveryAccess(deliveryId, req.user.id);

      if (!access.found) {
        return res.status(404).json({ success: false, error: "Delivery not found" });
      }

      if (!access.role) {
        return res.status(403).json({
          success: false,
          error: "You are not part of this delivery."
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

// Shared by HTTP routes and sockets.
async function getDeliveryAccess(deliveryId, userId) {
  const delivery = await Delivery.findById(deliveryId)
    .select("senderId travelerId status")
    .lean();

  if (!delivery) return { found: false, role: null, delivery: null };

  if (String(delivery.senderId) === String(userId)) {
    return { found: true, role: "sender", delivery, participantId: String(userId) };
  }

  if (delivery.travelerId) {
    const traveler = await Traveler.findOne({ user: userId }).select("_id").lean();

    if (traveler && String(traveler._id) === String(delivery.travelerId)) {
      return {
        found: true,
        role: "traveler",
        delivery,
        participantId: String(traveler._id)
      };
    }
  }

  return { found: true, role: null, delivery };
}

module.exports = {
  requireRole,
  requireVerified,
  requireSelf,
  requireSelfTraveler,
  requireAssignedTraveler,
  requireDeliveryParticipant,
  getDeliveryAccess
};
