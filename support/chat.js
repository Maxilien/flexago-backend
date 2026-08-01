// backend/support/chat.js
const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  const { message } = req.body;
  let reply = "I'm here to help!";
  const text = message?.toLowerCase() || "";

  if (text.includes("create")) {
    reply = "To create a delivery request, go to Create Request and fill in your details.";
  }

  if (text.includes("payout")) {
    reply = "Payouts are processed immediately once a delivery is completed. Travelers receive earnings instantly, similar to Uber or DoorDash.";
  }

  if (text.includes("verify")) {
    reply = "You can verify your identity using Stripe Identity in your profile settings.";
  }

  res.json({
    agent: "Alice",
    reply
  });
});

module.exports = router;
