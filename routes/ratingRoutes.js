/* ============================================================
   FLEXAGO RATING ROUTES
============================================================ */

const express = require("express");

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

   Required headers:
   x-user-id
   x-user-role: sender
============================================================ */

router.post(
  "/",
  createRating
);

/* ============================================================
   GET RATING FOR DELIVERY

   GET /api/ratings/delivery/:deliveryId

   Required headers:
   x-user-id
   x-user-role: sender
============================================================ */

router.get(
  "/delivery/:deliveryId",
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