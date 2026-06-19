// controllers/travelerController.js
// ------------------------------------------------------
// Flexagoo Traveler Controller (CommonJS)
// ------------------------------------------------------

console.log("🟢 travelerController.js LOADED");

const Traveler = require("../models/Traveler");
const User = require("../models/User");

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

// ⭐ FIXED — Get traveler details from USERS collection
async function getTravelerById(req, res) {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user.role !== "traveler") {
      return res.status(404).json({ success: false, error: "Traveler not found" });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        travelerProfile: user.travelerProfile
      }
    });

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
  getTravelerById,     // ⭐ Exported
  updateTravelerLocation
};
