// routes/deliveryRoutes.js
// ------------------------------------------------------
// Flexago Delivery Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 deliveryRoutes.js LOADED");

const express = require("express");
const {
  createDelivery,
  searchTravelerJobs,
  acceptTravelerJob,
  pickupTravelerJob,
  deliverTravelerJob,
  completeTravelerJob,
  payoutTravelerJob,
  verifyPickupCode   // ⭐ STEP 3 — NEW IMPORT
} = require("../controllers/deliveryController");

const Delivery = require("../models/Delivery");

const router = express.Router();

/* ============================================================
   CREATE DELIVERY (Sender)
============================================================ */
router.post(
  "/",
  (req, res, next) => {
    console.log("🔥 DELIVERY ROUTE HIT");
    next();
  },
  createDelivery
);

/* ============================================================
   TRAVELER JOB SEARCH
============================================================ */
router.post("/search", searchTravelerJobs);

/* ============================================================
   TRAVELER ACTIONS
============================================================ */
router.post("/:jobId/accept", acceptTravelerJob);
router.post("/:jobId/pickup", pickupTravelerJob);

// ⭐ STEP 3 — NEW PICKUP VERIFICATION ROUTE
router.post("/:jobId/verifyPickup", verifyPickupCode);

router.post("/:jobId/deliver", deliverTravelerJob);
router.post("/:jobId/complete", completeTravelerJob);
router.post("/:jobId/payout", payoutTravelerJob);

/* ============================================================
   GET ALL DELIVERIES (Admin / Debug)
============================================================ */
router.get("/", async (req, res) => {
  try {
    const deliveries = await Delivery.find().lean();
    res.json({ success: true, data: deliveries });
  } catch (err) {
    console.error("Error fetching deliveries:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/* ============================================================
   ⭐ GET DELIVERIES FOR A SPECIFIC SENDER (Sender Workspace)
============================================================ */
router.get("/sender/:senderId", async (req, res) => {
  try {
    const deliveries = await Delivery.find({ senderId: req.params.senderId })
      .select(
        "itemDescription status pickupAddress dropoffAddress price payout type insurance createdAt travelerId"
      )
      .lean();

    res.json({ success: true, data: deliveries });
  } catch (err) {
    console.error("Error fetching sender deliveries:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;

