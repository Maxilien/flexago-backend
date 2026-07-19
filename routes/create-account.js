const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");

router.post("/create", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role, kycVerified } = req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.json({ success: false, message: "Account already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role,
      kycVerified
    });

    return res.json({ success: true, user: newUser });

  } catch (err) {
    console.error("❌ Create Account Error:", err);
    return res.json({ success: false, message: "Unable to create account" });
  }
});

module.exports = router;

