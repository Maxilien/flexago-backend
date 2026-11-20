// routes/safetyRoutes.js
// ------------------------------------------------------
// Report and block, between people on the same delivery.
// ------------------------------------------------------

const express = require("express");

const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const rateLimit = require("../middleware/rateLimit");
const { requireDeliveryParticipant, getDeliveryAccess } = require("../middleware/access");
const SafetyReport = require("../models/SafetyReport");
const UserBlock = require("../models/UserBlock");
const Traveler = require("../models/Traveler");

const router = express.Router();

const reportLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyFn: (req) => req.user.id,
  message: "Too many reports. Please try again later."
});

async function otherPerson(deliveryId, userId) {
  const { role, delivery } = await getDeliveryAccess(deliveryId, userId);

  if (role === "sender") {
    const traveler = await Traveler.findById(delivery.travelerId).select("user").lean();
    return traveler ? String(traveler.user) : null;
  }

  return String(delivery.senderId);
}

router.post(
  "/deliveries/:deliveryId/report",
  auth,
  requireDeliveryParticipant(),
  reportLimit,
  async (req, res) => {
    try {
      const { reason, details } = req.body || {};

      if (!SafetyReport.REPORT_REASONS.includes(reason)) {
        return res.status(400).json({ success: false, error: "Please choose a reason." });
      }

      const reportedUserId = await otherPerson(req.params.deliveryId, req.user.id);

      if (!reportedUserId) {
        return res.status(409).json({ success: false, error: "There's no one to report on this delivery yet." });
      }

      await SafetyReport.create({
        reporterId: req.user.id,
        reportedUserId,
        deliveryId: req.params.deliveryId,
        reason,
        details: String(details || "").slice(0, 2000)
      });

      return res.status(201).json({ success: true });
    } catch (error) {
      console.error("Report error:", error);
      return res.status(500).json({ success: false, error: "Unable to send your report." });
    }
  }
);

router.post(
  "/deliveries/:deliveryId/block",
  auth,
  requireDeliveryParticipant(),
  async (req, res) => {
    try {
      const blockedId = await otherPerson(req.params.deliveryId, req.user.id);

      if (!blockedId) {
        return res.status(409).json({ success: false, error: "There's no one to block on this delivery yet." });
      }

      await UserBlock.updateOne(
        { blockerId: req.user.id, blockedId },
        { $setOnInsert: { blockerId: req.user.id, blockedId } },
        { upsert: true }
      );

      return res.status(201).json({ success: true });
    } catch (error) {
      console.error("Block error:", error);
      return res.status(500).json({ success: false, error: "Unable to block this person." });
    }
  }
);

// For the admin dashboard.
router.get("/admin/reports", adminAuth, async (req, res) => {
  const status = req.query.status === "reviewed" ? "reviewed" : "open";

  const reports = await SafetyReport.find({ status })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("reporterId reportedUserId", "firstName lastName email")
    .lean();

  res.json({ success: true, data: reports });
});

router.patch("/admin/reports/:id", adminAuth, async (req, res) => {
  await SafetyReport.updateOne({ _id: req.params.id }, { status: "reviewed" });
  res.json({ success: true });
});

module.exports = router;
