// backend/routes/userRoutes.js
// ------------------------------------------------------
// Flexagoo User Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 userRoutes.js LOADED");

const express = require("express");
const {
  getMe,
  updateMe,
  updateMyPhoto,
  deleteMe,
  loginUser
} = require("../controllers/userController");

const User = require("../models/User"); // ⭐ Needed for direct update

const router = express.Router();

const auth = require("../middleware/auth");
const { requireSelf } = require("../middleware/access");
const rateLimit = require("../middleware/rateLimit");

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `${req.ip}:${String(req.body?.email || "").toLowerCase()}`,
  message: "Too many login attempts. Please try again in 15 minutes."
});

// LOGIN
router.post("/login", loginLimit, loginUser);

// CURRENT USER
router.get("/me", auth, getMe);
router.put("/me", auth, updateMe);
router.put("/me/photo", auth, updateMyPhoto);
router.delete("/me", auth, deleteMe);

router.put("/payout-method/:id", auth, requireSelf("id"), async (req, res) => {
  try {
    const id = req.params.id;

    const {
      type,
      accountName,
      last4
    } = req.body;

    const updated = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          payoutMethod: {
            type,
            accountName,
            last4,
            updatedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.json({
      success: true,
      message: "Payout method saved successfully",
      payoutMethod: updated.payoutMethod
    });

  } catch (err) {
    console.error("Payout save error:", err);

    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});
module.exports = router;

