// backend/support/chat.js
const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  const { message } = req.body;
  let reply = "I'm here to help!";

  if (message?.toLowerCase().includes("create"))
    reply = "To create a delivery request, go to Create Request and fill in your details.";

  if (message?.toLowerCase().includes("payout"))
    reply = "Payouts are processed via Stripe within 1–3 business days.";

  if (message?.toLowerCase().includes("verify"))
    reply = "You can verify your identity using Stripe Identity in your profile settings.";

  res.json({ reply });
});

module.exports = router;
