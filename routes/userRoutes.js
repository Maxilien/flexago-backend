// backend/routes/userRoutes.js
// ------------------------------------------------------
// Flexagoo User Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 userRoutes.js LOADED");

const express = require("express");
const {
  createUser,
  getUserById,
  loginUser
} = require("../controllers/userController");

const User = require("../models/User"); // ⭐ Needed for direct update

const router = express.Router();

// REGISTER
router.post("/", createUser);

// LOGIN
router.post("/login", loginUser);

// GET USER BY ID
router.get("/:id", getUserById);

// ============================================================
// UPDATE USER (ADDRESS ONLY — IDENTITY LOCKED)
// ============================================================
router.put("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Only allow address fields (Option A)
    const allowed = {
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      zipcode: req.body.zipcode,
      country: req.body.country,
    };

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: allowed },
      { new: true }
    );

    if (!updated) {
      return res.json({ success: false, error: "User not found" });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update error:", err);
    res.json({ success: false, error: "Server error" });
  }
});

module.exports = router;

