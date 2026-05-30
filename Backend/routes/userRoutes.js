// ------------------------------------------------------
// Flexagoo User Routes
// ------------------------------------------------------

import express from "express";
import {
  createUser,
  getUserById,
  updateUser,
  loginUser
} from "../controllers/userController.js";

const router = express.Router();

// REGISTER
router.post("/", createUser);

// LOGIN
router.post("/login", loginUser);

// GET USER BY ID
router.get("/:id", getUserById);

// UPDATE USER
router.put("/:id", updateUser);



export default router;
