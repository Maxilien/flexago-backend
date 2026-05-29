console.log("🟢 deliveryRoutes.js LOADED FROM:", import.meta.url);

// routes/deliveryRoutes.js
// ------------------------------------------------------
// Flexago Delivery Routes
// ------------------------------------------------------

import express from "express";
import {
  createDelivery,
  searchTravelerJobs
} from "../controllers/deliveryController.js";

const router = express.Router();

// Sender creates a delivery
router.post("/", createDelivery);

// Traveler job search (POST because it requires JSON body)
router.post("/search", searchTravelerJobs);

export default router;

