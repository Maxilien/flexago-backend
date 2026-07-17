const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

// Ensure Stripe key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ Missing STRIPE_SECRET_KEY in Render Environment");
}

if (!process.env.STRIPE_IDENTITY_FLOW_ID) {
  console.error("❌ Missing STRIPE_IDENTITY_FLOW_ID in Render Environment");
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/verify/create-session
router.post("/create-session", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.json({ success: false, message: "Missing userId" });
    }

    // Create Stripe Identity Verification Session
    const session = await stripe.identity.verificationSessions.create({
      verification_flow: process.env.STRIPE_IDENTITY_FLOW_ID,
      metadata: { userId },

      // Stripe redirects user back to your frontend after verification
      return_url: "https://flexago-frontend.onrender.com/verify-stripe.html"
    });

    return res.json({
      success: true,
      url: session.url
    });

  } catch (err) {
    console.error("❌ Stripe Identity Error:", err);
    return res.json({
      success: false,
      message: "Unable to create verification session"
    });
  }
});

module.exports = router;
