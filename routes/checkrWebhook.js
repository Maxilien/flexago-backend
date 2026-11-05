const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const Traveler = require("../models/Traveler");

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

  if (event.type === "report.completed") {
    const report = event.data.object;

    const traveler = await Traveler.findOne({
      checkr_report_id: report.id
    });

    if (!traveler) return res.status(404).end();

    traveler.background_status = report.result; // clear, consider, suspended
    traveler.background_completed_at = new Date();

    await traveler.save();
  }

  return res.status(200).end();
});

module.exports = router;
