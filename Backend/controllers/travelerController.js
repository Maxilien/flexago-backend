// controllers/travelerController.js
// ------------------------------------------------------
// Flexagoo Traveler Controller (MongoDB + Mongoose)
// ------------------------------------------------------

import Traveler from "../models/Traveler.js";

// Create traveler profile
export const createTraveler = async (req, res) => {
  try {
    const traveler = await Traveler.create(req.body);
    res.status(201).json({ success: true, data: traveler });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get traveler by user ID
export const getTravelerByUser = async (req, res) => {
  try {
    const traveler = await Traveler.findOne({ user: req.params.userId }).populate("user");
    if (!traveler) return res.status(404).json({ success: false, error: "Traveler not found" });

    res.json({ success: true, data: traveler });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Update traveler location (real-time)
export const updateTravelerLocation = async (req, res) => {
  try {
    const { lng, lat } = req.body;

    const updated = await Traveler.findOneAndUpdate(
      { user: req.params.userId },
      {
        location: {
          type: "Point",
          coordinates: [lng, lat],
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
