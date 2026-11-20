/* ============================================================
   FLEXAGO RATING ROUTES
============================================================ */

const express = require("express");
const auth = require("../middleware/auth");

const {
  createRating,
  getRatingForDelivery,
  getTravelerRatingSummary
} = require(
  "../controllers/ratingController"
);

const router =
  express.Router();

/* ============================================================
   CREATE SENDER -> TRAVELER RATING

   POST /api/ratings

   Requires a logged-in sender.
============================================================ */

router.post(
  "/",
  auth,
  createRating
);

/* ============================================================
   GET RATING FOR DELIVERY

   GET /api/ratings/delivery/:deliveryId

   Requires a logged-in sender.
============================================================ */

router.get(
  "/delivery/:deliveryId",
  auth,
  getRatingForDelivery
);

/* ============================================================
   GET TRAVELER RATING SUMMARY

   GET /api/ratings/traveler/:travelerId
============================================================ */

router.get(
  "/traveler/:travelerId",
  getTravelerRatingSummary
);

/* ============================================================
   EXPORT
============================================================ */

module.exports =
  router;