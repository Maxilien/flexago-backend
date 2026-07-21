// backend/routes/verify.js
const express = require("express");
const router = express.Router();
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Temporary in-memory store (replace with DB later)
const codes = {};

// STEP 1 — SEND SMS CODE
router.post("/phone/send", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.json({ success: false, error: "Phone is required." });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    codes[phone] = code;

    // Send SMS
    await client.messages.create({
      body: `Your Flexago verification code is: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Twilio error:", err);
    res.json({ success: false, error: "Failed to send SMS." });
  }
});

// STEP 2 — VERIFY SMS CODE
router.post("/phone", (req, res) => {
  const { phone, code } = req.body;

  if (!codes[phone]) {
    return res.json({ success: false, error: "No code sent." });
  }

  if (codes[phone] !== code) {
    return res.json({ success: false, error: "Invalid code." });
  }

  delete codes[phone]; // cleanup

  res.json({ success: true });
});

module.exports = router;

