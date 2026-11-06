// controllers/cancellationController.js
// ------------------------------------------------------
// Cancelling a delivery, and refunding the sender.
// Before pickup the rules decide. After pickup, and for item
// problems, a person on the team decides.
// ------------------------------------------------------

const Stripe = require("stripe");
const Delivery = require("../models/Delivery");
const Traveler = require("../models/Traveler");
const {
  NO_SHOW_WAIT_MINUTES,
  noShowAllowed,
  outcomeFor,
  senderCase
} = require("../utils/cancellationPolicy");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const BEFORE_PICKUP = ["payment_pending", "payment_failed", "created", "available", "accepted"];
const toCents = (amount) => Math.round(Number(amount) * 100);

async function findRole(job, userId) {
  if (String(job.senderId) === String(userId)) return "sender";

  const traveler = await Traveler.findOne({ user: userId }).select("_id").lean();

  return traveler && String(traveler._id) === String(job.travelerId)
    ? "traveler"
    : null;
}

async function moveMoney(job, outcome) {
  const paid = job.paymentStatus === "paid" && job.stripePaymentIntentId;

  if (!paid) return;

  if (outcome.refundAmount > 0) {
    const refund = await stripe.refunds.create(
      { payment_intent: job.stripePaymentIntentId, amount: toCents(outcome.refundAmount) },
      { idempotencyKey: `flexago-cancel-refund-${job._id}` }
    );

    job.stripeRefundId = refund.id;
  }

  job.paymentStatus = outcome.refundAmount >= job.price ? "refunded" : "partially_refunded";
  job.refundStatus = "completed";

  if (outcome.travelerAmount > 0) {
    const traveler = await Traveler.findById(job.travelerId).select("stripeAccountId").lean();

    if (!traveler?.stripeAccountId) {
      job.travelerCancelPayStatus = "owed";
    } else {
      const transfer = await stripe.transfers.create(
        {
          amount: toCents(outcome.travelerAmount),
          currency: job.currency || "usd",
          destination: traveler.stripeAccountId,
          ...(job.stripeChargeId ? { source_transaction: job.stripeChargeId } : {}),
          description: `Flexago cancellation pay for delivery ${job._id}`,
          metadata: { deliveryId: job._id.toString() }
        },
        { idempotencyKey: `flexago-cancel-pay-${job._id}` }
      );

      job.stripeCancelTransferId = transfer.id;
      job.travelerCancelPayStatus = "paid";
    }
  }

  await job.save();
}

// Claims the delivery first, so a pickup can't slip in during the refund.
async function settle(jobId, fromStatuses, outcome, cancelledBy, note) {
  const job = await Delivery.findOneAndUpdate(
    { _id: jobId, status: { $in: fromStatuses }, stripeTransferId: { $in: [null, undefined] } },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy,
        cancellationCase: outcome.case,
        cancellationNote: note || "",
        refundAmount: outcome.refundAmount,
        travelerCancelPay: outcome.travelerAmount,
        refundStatus: "pending"
      }
    },
    { new: true }
  );

  if (!job) return null;

  try {
    await moveMoney(job, outcome);
  } catch (error) {
    console.error("❌ Cancellation refund error:", error.message);
    await Delivery.updateOne({ _id: job._id }, { $set: { refundStatus: "failed" } });
    job.refundStatus = "failed";
  }

  return job;
}

function reply(res, job, outcome) {
  if (job.refundStatus === "failed") {
    return res.status(502).json({
      success: false,
      error: "The delivery was cancelled, but the refund needs our team. We'll fix it and contact you."
    });
  }

  return res.json({ success: true, data: { status: job.status, ...outcome } });
}

async function loadForUser(req, res) {
  const job = await Delivery.findById(req.params.jobId);

  if (!job) {
    res.status(404).json({ success: false, error: "Delivery not found" });
    return {};
  }

  const role = await findRole(job, req.user.id);

  if (!role) {
    res.status(403).json({ success: false, error: "This delivery isn't yours" });
    return {};
  }

  return { job, role };
}

function termsFor(job, role) {
  return outcomeFor(role === "sender" ? senderCase(job, new Date()) : "traveler_cancelled", job.price);
}

async function previewCancel(req, res) {
  try {
    const { job, role } = await loadForUser(req, res);
    if (!job) return undefined;

    if (!BEFORE_PICKUP.includes(job.status)) {
      return res.status(409).json({ success: false, error: "This delivery can no longer be cancelled here. Please contact support." });
    }

    return res.json({ success: true, data: { price: job.price, ...termsFor(job, role) } });
  } catch (error) {
    console.error("❌ Cancel preview error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

async function cancelDelivery(req, res) {
  try {
    const { job, role } = await loadForUser(req, res);
    if (!job) return undefined;

    const outcome = termsFor(job, role);
    const settled = await settle(job._id, BEFORE_PICKUP, outcome, role);

    if (!settled) {
      return res.status(409).json({ success: false, error: "This delivery can no longer be cancelled here. Please contact support." });
    }

    if (role === "traveler") {
      await Traveler.updateOne({ _id: job.travelerId }, { $inc: { cancellationCount: 1 } });
    }

    return reply(res, settled, outcome);
  } catch (error) {
    console.error("❌ Cancel delivery error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

async function markArrived(req, res) {
  try {
    const job = await Delivery.findOneAndUpdate(
      { _id: req.params.jobId, status: "accepted", arrivedAt: null },
      { $set: { arrivedAt: new Date() } },
      { new: true }
    );

    if (!job) {
      return res.status(409).json({ success: false, error: "This job isn't waiting for pickup" });
    }

    return res.json({ success: true, data: { arrivedAt: job.arrivedAt } });
  } catch (error) {
    console.error("❌ Mark arrived error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

async function reportNoShow(req, res) {
  try {
    const job = await Delivery.findById(req.params.jobId);

    if (!job?.arrivedAt || job.status !== "accepted") {
      return res.status(409).json({ success: false, error: "Tap I've arrived first" });
    }

    if (!noShowAllowed(job, new Date())) {
      return res.status(409).json({ success: false, error: `Please wait ${NO_SHOW_WAIT_MINUTES} minutes after arriving.` });
    }

    const outcome = outcomeFor("sender_no_show", job.price);
    const settled = await settle(job._id, ["accepted"], outcome, "traveler");

    return settled
      ? reply(res, settled, outcome)
      : res.status(409).json({ success: false, error: "This job can no longer be cancelled" });
  } catch (error) {
    console.error("❌ No-show error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

// Money waits for a person, because this can be claimed falsely.
async function reportItemProblem(req, res) {
  try {
    const details = String(req.body?.details || "").trim().slice(0, 500);

    if (!details) {
      return res.status(400).json({ success: false, error: "Please describe the problem" });
    }

    const job = await Delivery.findOneAndUpdate(
      { _id: req.params.jobId, status: "accepted", arrivedAt: { $ne: null } },
      { $set: { status: "under_review", cancellationNote: details } },
      { new: true }
    );

    if (!job) {
      return res.status(409).json({ success: false, error: "Tap I've arrived first" });
    }

    return res.json({ success: true, data: { status: job.status } });
  } catch (error) {
    console.error("❌ Item problem error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

// Team decisions: an upheld item problem, or a full refund for a failed delivery.
async function resolveByAdmin(req, res) {
  try {
    const job = await Delivery.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, error: "Delivery not found" });
    }

    const decisions = {
      item_problem: { from: ["under_review"], outcome: "item_problem" },
      full_refund: { from: ["under_review", "accepted", "in_transit", "delivered"], outcome: "delivery_failed" }
    };
    const decision = decisions[req.body?.decision];

    if (!decision) {
      return res.status(400).json({ success: false, error: "Choose a decision" });
    }

    const outcome = outcomeFor(decision.outcome, job.price);
    const settled = await settle(job._id, decision.from, outcome, "admin", job.cancellationNote);

    return settled
      ? reply(res, settled, outcome)
      : res.status(409).json({ success: false, error: "This delivery can't be refunded here. The traveler may already be paid." });
  } catch (error) {
    console.error("❌ Admin resolve error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

module.exports = {
  cancelDelivery,
  markArrived,
  previewCancel,
  reportItemProblem,
  reportNoShow,
  resolveByAdmin
};
