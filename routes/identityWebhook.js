const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const TempEmail = require("../models/TempEmail");   // ⭐ Add this

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// RAW body required for Stripe signature verification
router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  /* ============================================================
     HANDLE SUCCESSFUL VERIFICATION
     ============================================================ */
  if (event.type === "identity.verification_session.verified") {
    const session = event.data.object;
    const userId = session.metadata.userId;

    console.log("🎉 Identity Verified for user:", userId);

    try {
      await TempEmail.findOneAndUpdate(
        { userId },
        { identityVerified: true },
        { new: true }
      );

      console.log("✅ User marked as verified in DB");
    } catch (dbErr) {
      console.error("❌ DB update error:", dbErr);
    }
  }

  /* ============================================================
     HANDLE VERIFICATION FAILURE
     ============================================================ */
  if (event.type === "identity.verification_session.requires_input") {
    const session = event.data.object;
    console.log("⚠️ Verification failed or needs input:", session.id);
  }

  res.json({ received: true });
});

module.exports = router;
