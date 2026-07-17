const express = require("express");
const router = express.Router();
const verifyEmail = require("../controllers/verifyEmailController");

// Send verification code (no userId required)
router.post("/email/resend", verifyEmail.sendEmailCode);

// Verify code (no userId required)
router.post("/email", verifyEmail.verifyEmailCode);

module.exports = router;