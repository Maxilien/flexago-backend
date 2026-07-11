const User = require("../models/User");
const { sendVerificationEmail } = require("../utils/emailService");

// SEND CODE
exports.sendEmailCode = async (req, res) => {
  try {
    const { userId, email } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, error: "User not found" });

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    user.email = email;
    user.emailVerificationCode = code;
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendVerificationEmail(email, code);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: "Failed to send code" });
  }
};

// VERIFY CODE
exports.verifyEmailCode = async (req, res) => {
  try {
    const { userId, code } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, error: "User not found" });

    if (!user.emailVerificationCode) {
      return res.json({ success: false, error: "No code generated" });
    }

    if (user.emailVerificationCode !== code) {
      return res.json({ success: false, error: "Invalid code" });
    }

    if (Date.now() > user.emailVerificationExpires) {
      return res.json({ success: false, error: "Code expired" });
    }

    user.emailVerified = true;
    user.emailVerificationCode = null;
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: "Verification failed" });
  }
};
