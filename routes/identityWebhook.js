const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Raw body required for Stripe signature verification
router.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle verification completed
  if (event.type === "identity.verification_session.verified") {
    const session = event.data.object;

    const userId = session.metadata.userId;
    console.log("User verified:", userId);

    // TODO: Update your DB user record
    // Example:
    // await User.findByIdAndUpdate(userId, { identityVerified: true });

  }

  // Handle verification failure
  if (event.type === "identity.verification_session.requires_input") {
    const session = event.data.object;
    console.log("Verification failed:", session.id);
  }

  res.json({ received: true });
});

module.exports = router;
