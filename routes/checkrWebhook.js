const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Checkr signs each webhook with an HMAC of the raw body.
function validSignature(rawBody, signature) {
  if (!process.env.CHECKR_API_KEY || !signature || !Buffer.isBuffer(rawBody)) {
    return false;
  }

  const expected = Buffer.from(
    crypto
      .createHmac("sha256", process.env.CHECKR_API_KEY)
      .update(rawBody)
      .digest("hex")
  );

  const received = Buffer.from(String(signature));

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

router.post("/", async (req, res) => {
  if (!validSignature(req.body, req.headers["x-checkr-signature"])) {
    return res.status(401).end();
  }

  const event = JSON.parse(req.body.toString("utf8"));

  const report = event.data?.object;

  if (report && /^report\.(created|completed|suspended)$/.test(event.type)) {
    // Only match on IDs that are present: an empty condition would
    // match any user and attach this result to the wrong person.
    const matches = [
      report.id && { checkr_report_id: report.id },
      report.candidate_id && { checkr_candidate_id: report.candidate_id }
    ].filter(Boolean);

    const user = matches.length
      ? await User.findOne({ $or: matches })
      : null;

    if (!user) return res.status(200).end();

    user.checkr_report_id = report.id;

    if (event.type === "report.created") {
      user.background_status = "pending";
    } else {
      const outcome = event.type === "report.suspended" ? "suspended" : report.result;

      // Only a clean result gives access. Anything else stays blocked.
      user.background_status =
        ["clear", "consider", "suspended"].includes(outcome) ? outcome : "consider";
      user.background_completed_at = new Date();
    }

    await user.save();
  }

  return res.status(200).end();
});

module.exports = router;
