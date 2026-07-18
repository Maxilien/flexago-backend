const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

// Ensure Stripe key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ Missing STRIPE_SECRET_KEY in Render Environment");
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/* ============================================================
   1. CREATE STRIPE IDENTITY VERIFICATION SESSION
   ============================================================ */
router.post("/create-session", async (req, res) => {
  try {
    // Create Stripe Identity Verification Session (correct mode)
    const session = await stripe.identity.verificationSessions.create({
      type: "document",

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

/* ============================================================
   2. CHECK VERIFICATION STATUS
   ============================================================ */
router.get("/check-session", async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.json({ verified: false, message: "Missing sessionId" });
    }

    const session = await stripe.identity.verificationSessions.retrieve(sessionId);

    return res.json({
      verified: session.status === "verified"
    });

  } catch (err) {
    console.error("❌ Stripe Session Check Error:", err);
    return res.json({
      verified: false,
      message: "Unable to check verification status"
    });
  }
});

module.exports = router;

