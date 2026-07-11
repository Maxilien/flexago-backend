const express = require("express");
const router = express.Router();
const verifyEmail = require("../controllers/verifyEmailController");

// Send verification code
router.post("/email/resend", verifyEmail.sendEmailCode);

// Verify code
router.post("/email", verifyEmail.verifyEmailCode);

module.exports = router;
