// routes/deliveryRoutes.js
// ------------------------------------------------------
// Flexago Delivery Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 deliveryRoutes.js LOADED");

const express = require("express");
const multer = require("multer");

const {
  createDelivery,
  searchTravelerJobs,
  acceptTravelerJob,
  pickupTravelerJob,
  deliverTravelerJob,
  completeTravelerJob,
  payoutTravelerJob
} = require("../controllers/deliveryController");

const Delivery = require("../models/Delivery");

const router = express.Router();

/* ============================================================
   ⭐ MULTER STORAGE — LOCAL UPLOADS
============================================================ */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* ============================================================
   ROUTES
============================================================ */

// Sender creates a delivery
router.post("/", (req, res, next) => {
  console.log("🔥 DELIVERY ROUTE HIT");
  next();
}, createDelivery);

// Traveler job search
router.post("/search", searchTravelerJobs);

// Traveler accepts a job
router.post("/:jobId/accept", acceptTravelerJob);

// Traveler picks up a job
router.post("/:jobId/pickup", pickupTravelerJob);

// Traveler delivers a job
router.post("/:jobId/deliver", deliverTravelerJob);

// ⭐ Traveler completes a job (Proof of Delivery)
router.post(
  "/:jobId/complete",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "signature", maxCount: 1 }
  ]),
  completeTravelerJob
);

// Traveler payout
router.post("/:jobId/payout", payoutTravelerJob);

// Get all deliveries
router.get("/", async (req, res) => {
  try {
    const deliveries = await Delivery.find();
    res.json({ success: true, data: deliveries });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
