// routes/adminAuth.js
const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// STEP 1 — Login (email + password → generate 2FA)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ error: "Invalid credentials" });

    // FIX: use admin.password (your DB field)
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    // Generate 6-digit 2FA code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    admin.twoFACode = code;
    admin.twoFAExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await admin.save();

    // ⭐ TEMP: Log code instead of sending SMS
    console.log("🔐 Admin 2FA code:", code);

    res.json({ status: "2fa_required" });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// STEP 2 — Verify 2FA (code → issue JWT)
router.post("/verify-2fa", async (req, res) => {
  const { email, code } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ error: "Invalid request" });

    if (!admin.twoFACode || admin.twoFACode !== code)
      return res.status(400).json({ error: "Invalid 2FA code" });

    if (Date.now() > admin.twoFAExpires)
      return res.status(400).json({ error: "2FA code expired" });

    // Clear 2FA fields
    admin.twoFACode = null;
    admin.twoFAExpires = null;
    await admin.save();

    // Issue JWT
    const token = jwt.sign(
      { adminId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({ token });
  } catch (err) {
    console.error("2FA verification error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
