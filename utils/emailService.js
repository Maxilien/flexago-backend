/* ============================================================
  Utils/emailService
============================================================ */
const nodemailer = require("nodemailer");

// Transporter using Gmail (App Password required)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,   // your Gmail
    pass: process.env.EMAIL_PASS    // your Gmail App Password
  }
});

// Send verification email
async function sendVerificationEmail(to, code) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: "Flexago Email Verification",
      html: `
        <p>Your Flexago verification code is:</p>
        <h2>${code}</h2>
        <p>This code expires in 10 minutes.</p>
      `
    });

    console.log("Verification email sent to:", to);
  } catch (err) {
    console.error("Email send error:", err);
  }
}

module.exports = { sendVerificationEmail };