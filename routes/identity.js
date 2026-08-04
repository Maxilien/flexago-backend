/* ============================================================
   routes/identity.js
============================================================ */
const express = require("express");
const router = express.Router();

// ✅ Guard with early return — stops execution if key is missing
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ Missing STRIPE_SECRET_KEY — Stripe Identity routes disabled.");
  module.exports = router; // export empty router, server keeps running
  return;                  // ✅ this was missing — stops the crash
}

// ✅ Only runs if key exists
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // ✅ use `new`

/* ============================================================
   1. CREATE STRIPE IDENTITY VERIFICATION SESSION
============================================================ */
router.post("/create-session", async (req, res) => {
  try {
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      return_url: "https://flexago-frontend.onrender.com/verify-stripe.html",
    });

    return res.json({ success: true, url: session.url });

  } catch (err) {
    console.error("❌ Stripe Identity Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create verification session",
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
      return res.status(400).json({ verified: false, message: "Missing sessionId" });
    }

    const session = await stripe.identity.verificationSessions.retrieve(sessionId);

    return res.json({ verified: session.status === "verified" });

  } catch (err) {
    console.error("❌ Stripe Session Check Error:", err.message);
    return res.status(500).json({
      verified: false,
      message: "Unable to check verification status",
    });
  }
});

console.log("🟢 Stripe Identity routes loaded");
module.exports = router;
