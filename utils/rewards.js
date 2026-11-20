// utils/rewards.js
// ------------------------------------------------------
// Promo codes, referral codes and launch rewards.
//
// Amounts live here so they can be changed in one place.
// ------------------------------------------------------

const crypto = require("crypto");
const Stripe = require("stripe");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const User = require("../models/User");
const Delivery = require("../models/Delivery");
const Traveler = require("../models/Traveler");
const PromoCode = require("../models/PromoCode");
const Reward = require("../models/Reward");

// Paid once, after a traveler's first completed delivery.
const TRAVELER_FIRST_TRIP_BONUS = 15;
// Paid to both people after the new user's first completed delivery.
const REFERRAL_REWARD = 10;
// Limits how many referrals one person can be rewarded for.
const MAX_REWARDED_REFERRALS = 20;
// Stripe will not charge a card less than this.
const MIN_CHARGE = 0.5;

const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const round2 = (value) => Math.round(value * 100) / 100;

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

/* ---------------- referral codes ---------------- */

function newReferralCode(firstName) {
  const name = String(firstName || "")
    .normalize("NFD")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 6) || "FLEXA";
  let tail = "";
  for (let i = 0; i < 4; i += 1) {
    tail += CODE_LETTERS[crypto.randomInt(CODE_LETTERS.length)];
  }
  return name + tail;
}

// Gives the user a referral code if they don't have one yet.
async function ensureReferralCode(user) {
  if (user.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = newReferralCode(user.firstName);
    try {
      const updated = await User.findOneAndUpdate(
        { _id: user._id, referralCode: { $in: [null, undefined] } },
        { $set: { referralCode: code } },
        { new: true }
      ).select("referralCode");

      if (updated) return updated.referralCode;

      const existing = await User.findById(user._id).select("referralCode").lean();
      return existing?.referralCode || null;
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }

  throw new Error("Unable to create a referral code");
}

async function findInviter(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return User.findOne({ referralCode: normalized }).select("_id firstName").lean();
}

/* ---------------- promo codes and credit ---------------- */

class RewardError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

async function hasPaidDelivery(senderId) {
  return Boolean(
    await Delivery.exists({
      senderId,
      paymentStatus: { $in: ["paid", "partially_refunded", "refunded"] }
    })
  );
}

// Checks a code without using it. Returns the code or throws.
async function findUsablePromo(code, senderId) {
  const normalized = normalizeCode(code);
  const promo = await PromoCode.findOne({ code: normalized }).lean();
  const now = new Date();

  if (!promo || !promo.active) {
    throw new RewardError("That promo code isn't valid.");
  }
  if (promo.expiresAt && promo.expiresAt <= now) {
    throw new RewardError("That promo code has expired.");
  }
  if (promo.maxUses && promo.uses >= promo.maxUses) {
    throw new RewardError("That promo code has been fully used.");
  }
  if (promo.usedBy.some((id) => String(id) === String(senderId))) {
    throw new RewardError("You've already used this promo code.");
  }
  if (promo.firstOrderOnly && (await hasPaidDelivery(senderId))) {
    throw new RewardError("This promo code is for your first delivery only.");
  }
  return promo;
}

/*
 * Works out the discount for a new delivery and reserves it.
 * The discount never exceeds FlexaGo's share of the price, so the
 * traveler is always paid in full from what the sender paid.
 */
async function reserveDiscount({ senderId, promoCode, price, payoutAmount }) {
  const maxDiscount = round2(Math.max(0, Math.min(price - payoutAmount, price - MIN_CHARGE)));
  const result = { discount: 0, promoCode: null, promoAmount: 0, creditUsed: 0 };

  if (promoCode) {
    const promo = await findUsablePromo(promoCode, senderId);
    const now = new Date();

    const claimed = await PromoCode.findOneAndUpdate(
      {
        _id: promo._id,
        active: true,
        usedBy: { $ne: senderId },
        $and: [
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
          { $or: [{ maxUses: null }, { $expr: { $lt: ["$uses", "$maxUses"] } }] }
        ]
      },
      { $inc: { uses: 1 }, $push: { usedBy: senderId } },
      { new: true }
    );

    if (!claimed) {
      throw new RewardError("That promo code can't be used right now.");
    }

    result.promoCode = claimed.code;
    result.promoAmount = round2(Math.min(claimed.amount, maxDiscount));
  }

  const room = round2(maxDiscount - result.promoAmount);
  const sender = await User.findById(senderId).select("creditBalance").lean();
  const wanted = round2(Math.min(sender?.creditBalance || 0, room));

  if (wanted > 0) {
    const taken = await User.findOneAndUpdate(
      { _id: senderId, creditBalance: { $gte: wanted } },
      { $inc: { creditBalance: -wanted } }
    );
    if (taken) result.creditUsed = wanted;
  }

  result.discount = round2(result.promoAmount + result.creditUsed);
  return result;
}

// Gives back a promo use and credit, e.g. when a delivery is cancelled
// with a full refund. Safe to call more than once.
async function releaseDiscount(deliveryId) {
  const delivery = await Delivery.findOneAndUpdate(
    { _id: deliveryId, discountReleased: { $ne: true }, discount: { $gt: 0 } },
    { $set: { discountReleased: true } }
  ).lean();

  if (!delivery) return false;

  await undoReservation(delivery.senderId, delivery);
  return true;
}

async function undoReservation(senderId, { promoCode, creditUsed }) {
  if (promoCode) {
    await PromoCode.updateOne(
      { code: promoCode, usedBy: senderId },
      { $inc: { uses: -1 }, $pull: { usedBy: senderId } }
    );
  }
  if (creditUsed > 0) {
    await User.updateOne({ _id: senderId }, { $inc: { creditBalance: creditUsed } });
  }
}

/* ---------------- rewards after a completed delivery ---------------- */

async function payReward(reward) {
  if (reward.method === "credit") {
    await User.updateOne({ _id: reward.user }, { $inc: { creditBalance: reward.amount } });
    reward.status = "credited";
    await reward.save();
    return reward;
  }

  const traveler = await Traveler.findOne({ user: reward.user }).select("stripeAccountId").lean();

  if (!traveler?.stripeAccountId) {
    reward.status = "owed";
    reward.error = "No payout account yet";
    await reward.save();
    return reward;
  }

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: Math.round(reward.amount * 100),
        currency: "usd",
        destination: traveler.stripeAccountId,
        description: `FlexaGo ${reward.type.replace(/_/g, " ")}`,
        metadata: { rewardId: String(reward._id), type: reward.type }
      },
      { idempotencyKey: `flexago-reward-${reward._id}` }
    );
    reward.status = "paid";
    reward.stripeTransferId = transfer.id;
    reward.error = null;
  } catch (error) {
    reward.status = "failed";
    reward.error = String(error.message || error).slice(0, 300);
  }

  await reward.save();
  return reward;
}

// Creates the reward once. Returns null if it already exists.
async function grant(fields) {
  try {
    const reward = await Reward.create(fields);
    return payReward(reward);
  } catch (error) {
    if (error.code === 11000) return null;
    throw error;
  }
}

const methodFor = (role) => (role === "traveler" ? "cash" : "credit");

async function grantReferral(member, deliveryId) {
  if (!member?.referredBy) return;

  const inviter = await User.findById(member.referredBy).select("_id role").lean();
  if (!inviter || String(inviter._id) === String(member._id)) return;

  const joined = await grant({
    user: member._id,
    type: "referral_joined",
    amount: REFERRAL_REWARD,
    method: methodFor(member.role),
    relatedUser: inviter._id,
    delivery: deliveryId
  });

  // Only the first completed delivery counts.
  if (!joined) return;

  const alreadyRewarded = await Reward.countDocuments({ user: inviter._id, type: "referral_inviter" });
  if (alreadyRewarded >= MAX_REWARDED_REFERRALS) return;

  await grant({
    user: inviter._id,
    type: "referral_inviter",
    amount: REFERRAL_REWARD,
    method: methodFor(inviter.role),
    relatedUser: member._id,
    delivery: deliveryId
  });
}

// Called after a traveler is paid for a delivery.
async function grantDeliveryRewards(deliveryId) {
  const delivery = await Delivery.findById(deliveryId).select("senderId travelerId").lean();
  if (!delivery) return;

  const traveler = await Traveler.findOne({
    $or: [{ _id: delivery.travelerId }, { user: delivery.travelerId }]
  }).select("user").lean();

  const [sender, travelerUser] = await Promise.all([
    User.findById(delivery.senderId).select("_id role referredBy").lean(),
    traveler ? User.findById(traveler.user).select("_id role referredBy").lean() : null
  ]);

  if (travelerUser) {
    await grant({
      user: travelerUser._id,
      type: "first_trip_bonus",
      amount: TRAVELER_FIRST_TRIP_BONUS,
      method: "cash",
      delivery: deliveryId
    });
  }

  await grantReferral(sender, deliveryId);
  await grantReferral(travelerUser, deliveryId);
}

// Pays rewards that waited for a payout account or failed.
async function retryReward(rewardId) {
  const reward = await Reward.findById(rewardId);
  if (!reward || !["owed", "failed"].includes(reward.status)) return null;
  return payReward(reward);
}

module.exports = {
  TRAVELER_FIRST_TRIP_BONUS,
  REFERRAL_REWARD,
  MAX_REWARDED_REFERRALS,
  RewardError,
  normalizeCode,
  ensureReferralCode,
  findInviter,
  findUsablePromo,
  reserveDiscount,
  undoReservation,
  releaseDiscount,
  grantDeliveryRewards,
  retryReward
};
