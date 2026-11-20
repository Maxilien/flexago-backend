// routes/rewardsRoutes.js
// The user's referral code, credit and rewards, and promo code checks.
const express = require("express");
const auth = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const User = require("../models/User");
const Reward = require("../models/Reward");
const {
  TRAVELER_FIRST_TRIP_BONUS,
  REFERRAL_REWARD,
  RewardError,
  ensureReferralCode,
  findUsablePromo
} = require("../utils/rewards");

const router = express.Router();

const promoCheckLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyFn: (req) => `promo:${req.user.id}`,
  message: "Too many promo code tries. Please wait a few minutes."
});

// GET /api/rewards/me
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("firstName role referralCode creditBalance").lean();
    const referralCode = await ensureReferralCode(user);

    const rewards = await Reward.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("relatedUser", "firstName")
      .lean();

    const invited = await User.countDocuments({ referredBy: user._id });

    return res.json({
      success: true,
      data: {
        role: user.role,
        referralCode,
        creditBalance: user.creditBalance || 0,
        invited,
        referralReward: REFERRAL_REWARD,
        firstTripBonus: TRAVELER_FIRST_TRIP_BONUS,
        rewards: rewards.map((reward) => ({
          type: reward.type,
          amount: reward.amount,
          method: reward.method,
          status: reward.status,
          friend: reward.relatedUser?.firstName || null,
          createdAt: reward.createdAt
        }))
      }
    });
  } catch (error) {
    console.error("Rewards lookup error:", error);
    return res.status(500).json({ success: false, error: "Unable to load rewards." });
  }
});

// POST /api/rewards/check-promo  { code }
// Checks a code before the sender creates the delivery. Nothing is used yet.
router.post("/check-promo", auth, promoCheckLimit, async (req, res) => {
  try {
    if (req.user.role !== "sender") {
      return res.status(403).json({ success: false, error: "Promo codes are for senders." });
    }

    const promo = await findUsablePromo(req.body?.code, req.user.id);

    return res.json({
      success: true,
      data: {
        code: promo.code,
        amount: promo.amount,
        firstOrderOnly: promo.firstOrderOnly,
        message: `$${promo.amount} off will be applied when you create this delivery.`
      }
    });
  } catch (error) {
    if (error instanceof RewardError) {
      return res.status(400).json({ success: false, error: error.message });
    }
    console.error("Promo check error:", error);
    return res.status(500).json({ success: false, error: "Unable to check this code." });
  }
});

module.exports = router;
