// routes/deliveryRoutes.js
// ------------------------------------------------------
// Flexago Delivery Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 deliveryRoutes.js LOADED");

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");
const Traveler = require("../models/Traveler");
const {
  requireRole,
  requireBackgroundClear,
  requireVerified,
  requireSelf,
  requireAssignedTraveler
} = require("../middleware/access");
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
const {
  cancelDelivery,
  markArrived,
  previewCancel,
  reportItemProblem,
  reportNoShow
} = require("../controllers/cancellationController");

const router = express.Router();

// Every delivery route requires a logged-in user.
router.use(auth);
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
  requireRole("sender"),
  requireVerified,
  requireBackgroundClear,
  (req, res, next) => {
    console.log("🔥 DELIVERY ROUTE HIT");
    next();
  },
  createDelivery
);

/* ============================================================
   TRAVELER JOB SEARCH
============================================================ */
router.post("/search", requireRole("traveler"), requireVerified, requireBackgroundClear, searchTravelerJobs);

/* ============================================================
   TRAVELER ACTIONS
============================================================ */
router.post("/:jobId/accept", requireRole("traveler"), requireVerified, acceptTravelerJob);

// The traveler photographs the item before taking it (at least one photo).
router.post(
  "/:jobId/pickup",
  requireAssignedTraveler(),
  proofUpload.fields([{ name: "photo", maxCount: 3 }]),
  pickupTravelerJob
);

// ⭐ NEW — Pickup Verification Route
router.post("/:jobId/verifyPickup", requireAssignedTraveler(), verifyPickupCode);

router.post("/:jobId/deliver", requireAssignedTraveler(), deliverTravelerJob);

// Cancelling and problems at pickup
router.get("/:jobId/cancel-preview", previewCancel);
router.post("/:jobId/cancel", cancelDelivery);
router.post("/:jobId/arrived", requireAssignedTraveler(), markArrived);
router.post("/:jobId/no-show", requireAssignedTraveler(), reportNoShow);
router.post("/:jobId/item-problem", requireAssignedTraveler(), reportItemProblem);

router.post(
  "/:jobId/complete",

  requireAssignedTraveler(),

  proofUpload.fields([
    {
      name: "photo",
      maxCount: 5
    },
    {
      name: "signature",
      maxCount: 1
    }
  ]),

  completeTravelerJob
);
router.post("/:jobId/payout", requireAssignedTraveler(), payoutTravelerJob);

/* ============================================================
   GET THE LOGGED-IN USER'S DELIVERIES
============================================================ */
router.get("/", async (req, res) => {
  try {
    let filter = { senderId: req.user.id };

    if (req.user.role === "traveler") {
      const traveler = await Traveler.findOne({ user: req.user.id })
        .select("_id")
        .lean();

      filter = { travelerId: traveler?._id || null };
    }

    const deliveries = await Delivery.find(filter)
      .select("-declinedBy")
      .lean();

    // Only the sender holds the code they give the traveler at pickup.
    if (req.user.role === "traveler") {
      deliveries.forEach((delivery) => {
        delete delivery.pickupCode;
        delete delivery.pickupQR;
      });
    }

    res.json({ success: true, data: deliveries });
  } catch (err) {
    console.error("Error fetching deliveries:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/* ============================================================
   ⭐ GET DELIVERIES FOR A SPECIFIC SENDER (Sender Workspace)
============================================================ */
router.get("/sender/:senderId", requireSelf("senderId"), async (req, res) => {
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

