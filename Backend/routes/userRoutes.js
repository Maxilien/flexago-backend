// backend/routes/userRoutes.js
// ------------------------------------------------------
// Flexagoo User Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 userRoutes.js LOADED");

const express = require("express");
const {
  createUser,
  getUserById,
  updateUser,
  loginUser
} = require("../controllers/userController");

const router = express.Router();

// REGISTER
router.post("/", createUser);

// LOGIN
router.post("/login", loginUser);

// GET USER BY ID
router.get("/:id", getUserById);

// UPDATE USER
router.put("/:id", updateUser);

module.exports = router;
