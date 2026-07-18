const express = require("express");
const router = express.Router();
const TempEmail = require("../models/TempEmail"); // or your User model

// GET /api/verify/status?userId=123
router.get("/status", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.json({ verified: false, message: "Missing userId" });
    }

    const user = await TempEmail.findOne({ userId });

    if (!user) {
      return res.json({ verified: false, message: "User not found" });
    }

    return res.json({ verified: user.identityVerified === true });

  } catch (err) {
    console.error("❌ Status Check Error:", err);
    return res.json({ verified: false });
  }
});

module.exports = router;
