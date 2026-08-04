// controllers/authController.js
async function verifyEmail(req, res) {
  try {
    // ... your verification logic ...
    res.status(200).json({ 
      message: req.t("delivery.confirm")  // ✅ auto-translates per user's language
    });
  } catch (err) {
    res.status(500).json({ 
      error: req.t("errors:server_error")  // ✅ pulls from errors.json
    });
  }
}
