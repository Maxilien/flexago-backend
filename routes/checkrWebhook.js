const express = require("express");
const router = express.Router();
const Traveler = require("../models/Traveler");

router.post("/", async (req, res) => {
  const event = req.body;

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

  res.status(200).end();
});

module.exports = router;
