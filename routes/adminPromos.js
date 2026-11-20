// routes/adminPromos.js
// Admin: create and turn off promo codes, see and retry rewards.
const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const PromoCode = require("../models/PromoCode");
const Reward = require("../models/Reward");
const { normalizeCode, retryReward } = require("../utils/rewards");

const router = express.Router();

// GET /api/admin/promos
router.get("/", adminAuth, async (req, res) => {
  try {
    const promos = await PromoCode.find().sort({ createdAt: -1 }).select("-usedBy").lean();
    return res.json({ success: true, data: promos });
  } catch (error) {
    console.error("Promo list error:", error);
    return res.status(500).json({ success: false, error: "Unable to load promo codes." });
  }
});

// POST /api/admin/promos  { code, amount, description, firstOrderOnly, maxUses, expiresAt }
router.post("/", adminAuth, async (req, res) => {
  try {
    const code = normalizeCode(req.body?.code);
    const amount = Number(req.body?.amount);
    const maxUses = req.body?.maxUses ? Number(req.body.maxUses) : null;
    const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;

    if (!/^[A-Z0-9]{3,20}$/.test(code)) {
      return res.status(400).json({ success: false, error: "Use 3 to 20 letters or numbers for the code." });
    }
    if (!Number.isFinite(amount) || amount < 1 || amount > 100) {
      return res.status(400).json({ success: false, error: "Amount must be between $1 and $100." });
    }
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
      return res.status(400).json({ success: false, error: "Max uses must be a whole number, or empty for no limit." });
    }
    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) {
      return res.status(400).json({ success: false, error: "The end date must be in the future." });
    }

    const promo = await PromoCode.create({
      code,
      amount: Math.round(amount * 100) / 100,
      description: String(req.body?.description || "").slice(0, 200),
      firstOrderOnly: req.body?.firstOrderOnly !== false,
      maxUses,
      expiresAt,
      createdBy: String(req.admin?.email || req.admin?.id || "")
    });

    return res.status(201).json({ success: true, data: promo });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: "That code already exists." });
    }
    console.error("Promo create error:", error);
    return res.status(500).json({ success: false, error: "Unable to create the promo code." });
  }
});

// PATCH /api/admin/promos/:id  { active }
router.patch("/:id", adminAuth, async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndUpdate(
      req.params.id,
      { $set: { active: Boolean(req.body?.active) } },
      { new: true }
    ).select("-usedBy");

    if (!promo) return res.status(404).json({ success: false, error: "Promo code not found." });
    return res.json({ success: true, data: promo });
  } catch (error) {
    console.error("Promo update error:", error);
    return res.status(500).json({ success: false, error: "Unable to update the promo code." });
  }
});

// GET /api/admin/promos/rewards
router.get("/rewards", adminAuth, async (req, res) => {
  try {
    const rewards = await Reward.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("user", "firstName lastName email role")
      .populate("relatedUser", "firstName lastName")
      .lean();
    return res.json({ success: true, data: rewards });
  } catch (error) {
    console.error("Reward list error:", error);
    return res.status(500).json({ success: false, error: "Unable to load rewards." });
  }
});

// POST /api/admin/promos/rewards/:id/retry
router.post("/rewards/:id/retry", adminAuth, async (req, res) => {
  try {
    const reward = await retryReward(req.params.id);
    if (!reward) {
      return res.status(409).json({ success: false, error: "Only owed or failed rewards can be retried." });
    }
    return res.json({ success: true, data: reward });
  } catch (error) {
    console.error("Reward retry error:", error);
    return res.status(500).json({ success: false, error: "Unable to retry this reward." });
  }
});

module.exports = router;
