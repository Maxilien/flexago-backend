const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Create Stripe Identity Verification Session
router.post("/create-session", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.json({ success: false, message: "Missing userId" });
    }

    // Create verification session using your Flow ID
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      verification_flow: process.env.STRIPE_IDENTITY_FLOW_ID,
      metadata: {
        userId: userId
      }
    });

    return res.json({
      success: true,
      url: session.url
    });

  } catch (err) {
    console.error("Stripe Identity Error:", err);
    return res.json({ success: false, message: "Unable to create session" });
  }
});

module.exports = router;
