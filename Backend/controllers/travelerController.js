// controllers/travelerController.js
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

module.exports = {
  createTraveler,
  getTravelerByUser,
  updateTravelerLocation
};
