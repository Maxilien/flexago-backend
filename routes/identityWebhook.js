const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const OnboardingSession = require("../models/OnboardingSession");
const {
  applyIdentityResult,
  retrieveVerification
} = require("./onboardingRoutes");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// RAW body required for Stripe signature verification
router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send("Webhook signature verification failed");
  }

  if (
    event.type === "identity.verification_session.verified" ||
    event.type === "identity.verification_session.requires_input" ||
    event.type === "identity.verification_session.canceled"
  ) {
    try {
      const verification = event.data.object;
      const session = await OnboardingSession.findById(
        verification.metadata?.onboardingSessionId
      );

      if (session) {
        await applyIdentityResult(
          session,
          await retrieveVerification(stripe, verification.id)
        );
      }
    } catch (err) {
      console.error("Identity webhook error:", err);
      return res.status(500).end();
    }
  }

  return res.json({ received: true });
});

module.exports = router;
