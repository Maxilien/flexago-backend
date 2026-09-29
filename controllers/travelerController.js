// ------------------------------------------------------
// Flexagoo Traveler Controller (CommonJS)
// ------------------------------------------------------

console.log("🟢 travelerController.js LOADED");

const Traveler = require("../models/Traveler");

// Create traveler profile
async function createTraveler(req, res) {
  try {
    const traveler = await Traveler.create(req.body);
    res.status(201).json({ success: true, data: traveler });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

// Get traveler by user ID
async function getTravelerByUser(req, res) {
  try {
    const traveler = await Traveler.findOne({ user: req.params.userId }).populate("user");
    if (!traveler) {
      return res.status(404).json({ success: false, error: "Traveler not found" });
    }

    res.json({ success: true, data: traveler });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

// Update traveler location (real-time)
async function updateTravelerLocation(req, res) {
  try {
    const { lng, lat } = req.body;

    const updated = await Traveler.findOneAndUpdate(
      { user: req.params.userId },
      {
        location: {
          type: "Point",
          coordinates: [lng, lat],
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

/* ============================================================
   ⭐ UPDATE TRAVELER (ADDRESS ONLY — IDENTITY LOCKED)
============================================================ */
async function updateTraveler(req, res) {
  try {
    const id = req.params.id;

    const allowed = {
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      zipcode: req.body.zipcode,
      country: req.body.country,
    };

    const updated = await Traveler.findByIdAndUpdate(
      id,
      { $set: allowed },
      { new: true }
    );

    if (!updated) {
      return res.json({ success: false, error: "Traveler not found" });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Traveler update error:", err);
    res.json({ success: false, error: "Server error" });
  }
}

module.exports = {
  createTraveler,
  getTravelerByUser,
  updateTravelerLocation,
  updateTraveler   // ⭐ REQUIRED EXPORT
};
