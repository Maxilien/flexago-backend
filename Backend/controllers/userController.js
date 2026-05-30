// controllers/userController.js
// ------------------------------------------------------
// Flexagoo User Controller (MongoDB + Mongoose)
// ------------------------------------------------------

import User from "../models/User.js";

// Create new user (registration)
export const createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
// ------------------------------------------------------
// LOGIN USER
// ------------------------------------------------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    // Simple password check (no hashing yet)
    if (user.password !== password)
      return res.status(401).json({ success: false, error: "Invalid password" });

    // Return user (remove password)
    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({ success: true, data: safeUser });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

