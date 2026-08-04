// utils/emailService.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify SMTP connection on server startup
transporter.verify((error) => {
  if (error) {
    console.error("❌ Email transporter connection failed:", error);
  } else {
    console.log("✅ Email transporter ready");
  }
});

// Send verification email
async function sendVerificationEmail(to, code) {
  try {
    await transporter.sendMail({
      from: `"FlexaGo" <${process.env.EMAIL_USER}>`,
      to,
      subject: "FlexaGo Email Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
          <h2 style="color: #00A3FF;">FlexaGo Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing: 8px; color: #0a1628;">${code}</h1>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p style="color: #999; font-size: 12px;">
            If you did not request this, please ignore this email.
          </p>
        </div>
      `,
    });

    console.log("✅ Verification email sent to:", to);
  } catch (err) {
    console.error("❌ Failed to send verification email:", err);
    throw err; // important: let caller handle failure
  }
}

module.exports = { sendVerificationEmail };
