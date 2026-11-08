// routes/waitlistRoutes.js
// Public: join the waitlist from the website footer.
// Admin: list who joined, newest first.
const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const rateLimit = require("../middleware/rateLimit");
const WaitlistEntry = require("../models/WaitlistEntry");

const router = express.Router();

const joinLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyFn: (req) => `waitlist:${req.ip}`,
  message: "Too many sign-ups from this connection. Please try again later."
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLES = ["sender", "traveler", "both"];

// POST /api/waitlist  { email, city, role }
router.post("/", joinLimit, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const city = String(req.body?.city || "").trim().slice(0, 80);
  const role = ROLES.includes(req.body?.role) ? req.body.role : "both";

  if (!EMAIL.test(email) || email.length > 254) {
    return res.status(400).json({ success: false, error: "Please enter a valid email address." });
  }

  try {
    // Joining twice just updates the city and role; the answer is the same,
    // so the form can't be used to find out who is already on the list.
    await WaitlistEntry.updateOne(
      { email },
      { $set: { city, role }, $setOnInsert: { email, source: "website" } },
      { upsert: true }
    );

    return res.status(201).json({ success: true });
  } catch (error) {
    if (error.code === 11000) return res.status(201).json({ success: true });
    console.error("Waitlist join error:", error);
    return res.status(500).json({ success: false, error: "Couldn't save that. Please try again." });
  }
});

// GET /api/waitlist (admin)
router.get("/", adminAuth, async (req, res) => {
  try {
    const entries = await WaitlistEntry.find().sort({ createdAt: -1 }).limit(1000).lean();
    const total = await WaitlistEntry.countDocuments();
    return res.json({ success: true, total, data: entries });
  } catch (error) {
    console.error("Waitlist list error:", error);
    return res.status(500).json({ success: false, error: "Unable to load the waitlist." });
  }
});

module.exports = router;
