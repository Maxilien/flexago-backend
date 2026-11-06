// routes/backgroundRoutes.js
// ------------------------------------------------------
// The background check every user passes after creating an
// account. Checkr's result decides, with no manual step.
// ------------------------------------------------------

const express = require("express");
const auth = require("../middleware/auth");
const { requireVerified } = require("../middleware/access");
const User = require("../models/User");
const checkr = require("../support/checkr");

const router = express.Router();

router.get("/status", auth, (req, res) => {
  const { background_status: status, checkr_invitation_url: url } = req.user.user;

  res.json({ success: true, status, url: status === "invited" ? url : null });
});

// Returns Checkr's hosted application link.
router.post("/start", auth, requireVerified, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.background_status === "clear") {
      return res.json({ success: true, alreadyClear: true });
    }

    if (!checkr.isConfigured()) {
      return res.status(503).json({ success: false, error: "Background checks aren't available yet. Please try again soon." });
    }

    if (user.checkr_invitation_url) {
      return res.json({ success: true, url: user.checkr_invitation_url });
    }

    user.checkr_candidate_id =
      user.checkr_candidate_id || await checkr.createCandidate(user);

    user.checkr_invitation_url =
      await checkr.createInvitation(user.checkr_candidate_id, user);

    user.background_status = "invited";
    await user.save();

    return res.json({ success: true, url: user.checkr_invitation_url });
  } catch (err) {
    console.error("Background check error:", err.message);
    return res.status(502).json({ success: false, error: "Unable to start your background check. Please try again." });
  }
});

module.exports = router;
