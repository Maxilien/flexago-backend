const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { sendBackgroundClearedEmail } = require("../utils/emailService");
const { sendBackgroundClearedSms } = require("../utils/smsService");

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

// Report lifecycle events FlexaGo acts on. Only "completed" with a clear
// result, or "engaged" after FlexaGo's own review, gives access.
const REPORT_STAGES = new Set([
  "created", "completed", "suspended", "resumed", "canceled",
  "disputed", "engaged", "pre_adverse_action", "post_adverse_action"
]);

router.post("/", async (req, res) => {
  if (!validSignature(req.body, req.headers["x-checkr-signature"])) {
    return res.status(401).end();
  }

  const event = JSON.parse(req.body.toString("utf8"));

  const report = event.data?.object;

  // An invitation link that expired or was deleted can't be used, so the
  // user starts again and gets a fresh link from /api/background/start.
  if (report?.candidate_id && /^invitation\.(expired|deleted)$/.test(event.type)) {
    await User.updateOne(
      { checkr_candidate_id: report.candidate_id, background_status: "invited" },
      { $set: { background_status: "not_started", checkr_invitation_url: null } }
    );
    return res.status(200).end();
  }

  const stage = event.type?.startsWith("report.") ? event.type.slice(7) : null;

  if (report && stage && REPORT_STAGES.has(stage)) {
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

    const wasClear = user.background_status === "clear";

    user.checkr_report_id = report.id;

    if (stage === "created" || stage === "resumed") {
      user.background_status = "pending";
    } else if (stage === "completed") {
      // Only a clean result gives access. Anything else stays blocked.
      user.background_status = report.result === "clear" ? "clear" : "consider";
      user.background_completed_at = new Date();
    } else if (stage === "engaged") {
      // FlexaGo reviewed a "consider" report in Checkr and chose to go ahead.
      user.background_status = "clear";
      user.background_completed_at = new Date();
    } else if (stage === "canceled") {
      // No result: the user may start again with a fresh invitation.
      user.background_status = "canceled";
      user.checkr_invitation_url = null;
    } else {
      // suspended, disputed, pre_adverse_action, post_adverse_action: blocked.
      user.background_status = stage;
      user.background_completed_at = new Date();
    }

    await user.save();

    if (!wasClear && user.background_status === "clear") {
      await Promise.allSettled([
        sendBackgroundClearedEmail({ to: user.email }),
        sendBackgroundClearedSms({ to: user.phone })
      ]);
    }
  }

  return res.status(200).end();
});

module.exports = router;
