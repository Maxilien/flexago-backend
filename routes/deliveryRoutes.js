// routes/deliveryRoutes.js
// ------------------------------------------------------
// Flexago Delivery Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 deliveryRoutes.js LOADED");

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  createDelivery,
  searchTravelerJobs,
  acceptTravelerJob,
  pickupTravelerJob,
  deliverTravelerJob,
  completeTravelerJob,
  payoutTravelerJob,
  verifyPickupCode   // ⭐ NEW — pickup verification controller
} = require("../controllers/deliveryController");

const Delivery = require("../models/Delivery");

const router = express.Router();
/* ============================================================
   PROOF OF DELIVERY UPLOAD
============================================================ */

const uploadsDirectory =
  path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(
    uploadsDirectory,
    {
      recursive: true
    }
  );
}

const proofStorage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback
    ) => {
      callback(
        null,
        uploadsDirectory
      );
    },

    filename: (
      req,
      file,
      callback
    ) => {
      const extension =
        path.extname(
          file.originalname
        ) || ".png";

      const uniqueName =
        `${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}${extension}`;

      callback(
        null,
        uniqueName
      );
    }
  });

const proofUpload =
  multer({
    storage: proofStorage,

    limits: {
      fileSize:
        10 * 1024 * 1024
    },

    fileFilter: (
      req,
      file,
      callback
    ) => {
      if (
        file.mimetype &&
        file.mimetype.startsWith(
          "image/"
        )
      ) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          "Only image files are allowed."
        )
      );
    }
  });

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

// ⭐ NEW — Pickup Verification Route
router.post("/:jobId/verifyPickup", verifyPickupCode);

router.post("/:jobId/deliver", deliverTravelerJob);
router.post(
  "/:jobId/complete",

  proofUpload.fields([
    {
      name: "photo",
      maxCount: 1
    },
    {
      name: "signature",
      maxCount: 1
    }
  ]),

  completeTravelerJob
);
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

