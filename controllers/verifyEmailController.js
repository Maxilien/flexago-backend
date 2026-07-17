const TempEmail = require("../models/TempEmail");
const { sendVerificationEmail } = require("../utils/emailService");

// SEND CODE (no userId required)
exports.sendEmailCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ success: false, error: "Email is required" });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save or update temporary email record
    await TempEmail.findOneAndUpdate(
      { email },
      {
        email,
        code,
        expires: Date.now() + 10 * 60 * 1000 // 10 minutes
      },
      { upsert: true }
    );

    await sendVerificationEmail(email, code);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: "Failed to send code" });
  }
};

// VERIFY CODE (no userId required)
exports.verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    const record = await TempEmail.findOne({ email });
    if (!record) {
      return res.json({ success: false, error: "No code generated" });
    }

    if (record.code !== code) {
      return res.json({ success: false, error: "Invalid code" });
    }

    if (Date.now() > record.expires) {
      return res.json({ success: false, error: "Code expired" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: "Verification failed" });
  }
};