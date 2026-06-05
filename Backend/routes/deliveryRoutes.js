// routes/deliveryRoutes.js
// ------------------------------------------------------
// Flexago Delivery Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 deliveryRoutes.js LOADED");

const express = require("express");
const {
  createDelivery,
  searchTravelerJobs
} = require("../controllers/deliveryController");

const router = express.Router();

// Sender creates a delivery
router.post("/", (req, res, next) => {
  console.log("🔥 DELIVERY ROUTE HIT");
  next();
}, createDelivery);

// Traveler job search (POST because it requires JSON body)
router.post("/search", searchTravelerJobs);

module.exports = router;
