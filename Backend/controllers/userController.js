// controllers/userController.js
// ------------------------------------------------------
// Flexagoo User Controller (CommonJS)
// ------------------------------------------------------

console.log("🟢 userController.js LOADED");

const User = require("../models/User");
const Traveler = require("../models/Traveler");
const bcrypt = require("bcryptjs");

// ------------------------------------------------------
// CREATE USER + AUTO‑CREATE TRAVELER PROFILE
// ------------------------------------------------------
async function createUser(req, res) {
  try {
    // 1. Create the user (password is auto‑hashed by User model)
    const user = await User.create(req.body);

    // 2. Check if Traveler already exists (safety)
    let traveler = await Traveler.findOne({ user: user._id });

    // 3. If not, create Traveler profile automatically
    if (!traveler) {
      traveler = await Traveler.create({
        user: user._id,                     // ⭐ FIXED FIELD NAME
        vehicleType: "car",
        yearJoined: new Date().getFullYear(),
        totalTrips: 0,
        createdAt: new Date()
      });
    }

    // 4. Return both
    res.status(201).json({
      success: true,
      data: {
        user,
        traveler
      }
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

// ------------------------------------------------------
// GET USER BY ID
// ------------------------------------------------------
async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    res.json({ success: true, data: user });

  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

// ------------------------------------------------------
// UPDATE USER
// ------------------------------------------------------
async function updateUser(req, res) {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({ success: true, data: updated });

  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

// ------------------------------------------------------
// LOGIN USER (SECURE VERSION)
// ------------------------------------------------------
async function loginUser(req, res) {
  try {
    // ⭐ Always lowercase email before searching
    const email = req.body.email.toLowerCase();
    const password = req.body.password;

    // 1. Find user and explicitly include password
    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    // 2. Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, error: "Invalid password" });

    // 3. Remove password before sending
    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({ success: true, data: safeUser });

  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = {
  createUser,
  getUserById,
  updateUser,
  loginUser
};
