// routes/adminAuth.js
const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("../middleware/rateLimit");
const { sendAdminLoginCodeSms } = require("../utils/smsService");
const { sendAdminLoginCodeEmail } = require("../utils/emailService");

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `admin:${req.ip}`,
  message: "Too many login attempts. Please try again in 15 minutes."
});

const verifyLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyFn: (req) => `admin-verify:${req.ip}`,
  message: "Too many code attempts. Please try again in 15 minutes."
});

function hashCode(adminId, code) {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${adminId}:${code}`)
    .digest("hex");
}

function sameHash(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// STEP 1 — Login (email + password → send a 2FA code)
router.post("/login", loginLimit, async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ error: "Invalid credentials" });

    // FIX: use admin.password (your DB field)
    const valid = await bcrypt.compare(String(password), admin.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const code = crypto.randomInt(100000, 1000000).toString();

    admin.twoFACode = hashCode(admin._id, code);
    admin.twoFAExpires = Date.now() + CODE_TTL_MS;
    admin.twoFAAttempts = 0;
    await admin.save();

    // Text and email, so a Twilio or email outage can't lock an admin out.
    const [textSent, emailSent] = await Promise.all([
      sendAdminLoginCodeSms({
        to: admin.phone || process.env.ADMIN_2FA_PHONE,
        code
      }),
      sendAdminLoginCodeEmail(admin.email, code)
    ]);

    if (!textSent && !emailSent) {
      admin.twoFACode = null;
      admin.twoFAExpires = null;
      await admin.save();

      return res.status(503).json({
        error: "Unable to send your login code. Please try again."
      });
    }

    res.json({ status: "2fa_required" });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// STEP 2 — Verify 2FA (code → issue JWT)
router.post("/verify-2fa", verifyLimit, async (req, res) => {
  const { email, code } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ error: "Invalid request" });

    if (!admin.twoFACode)
      return res.status(400).json({ error: "Invalid 2FA code" });

    if (Date.now() > admin.twoFAExpires)
      return res.status(400).json({ error: "2FA code expired" });

    if (!sameHash(admin.twoFACode, hashCode(admin._id, String(code)))) {
      admin.twoFAAttempts += 1;

      // Too many wrong codes cancels this one; logging in sends a new code.
      if (admin.twoFAAttempts >= MAX_CODE_ATTEMPTS) {
        admin.twoFACode = null;
        admin.twoFAExpires = null;
      }

      await admin.save();

      return res.status(400).json({ error: "Invalid 2FA code" });
    }

    // Clear 2FA fields
    admin.twoFACode = null;
    admin.twoFAExpires = null;
    admin.twoFAAttempts = 0;
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
