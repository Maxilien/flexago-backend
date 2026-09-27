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
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      dob,
      address,
      city,
      state,
      zipcode,
      country
    } = req.body;

    // ⭐ Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields."
      });
    }

    // ⭐ Create user (password auto‑hashed by User model)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      dob,
      address,
      city,
      state,
      zipcode,
      country,
      kyc: { verified: true } // optional: mark verified
    });

    // ⭐ Auto‑create Traveler profile
    let traveler = await Traveler.findOne({ user: user._id });

    if (!traveler) {
      traveler = await Traveler.create({
        user: user._id,
        vehicleType: "car",
        yearJoined: new Date().getFullYear(),
        totalTrips: 0,
        createdAt: new Date()
      });
    }

    // ⭐ Return clean user object (no password)
    const safeUser = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      dob: user.dob,
      address: user.address,
      city: user.city,
      state: user.state,
      zipcode: user.zipcode,
      country: user.country,
      kycVerified: user.kyc?.verified || false
    };

    res.status(201).json({
      success: true,
      data: {
        user: safeUser,
        traveler
      }
    });

  } catch (err) {
    console.error("❌ Create User Error:", err);
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
    const email = req.body.email.toLowerCase();
    const password = req.body.password;

    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, error: "Invalid password" });

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
