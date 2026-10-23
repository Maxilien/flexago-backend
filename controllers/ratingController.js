/* ============================================================
   FLEXAGO RATING CONTROLLER

   Handles Sender-to-Traveler ratings for completed deliveries.

   User identity:
   - x-user-id
   - x-user-role

   Security:
   - Only the delivery's Sender can submit a rating.
   - The Traveler is obtained from the delivery record.
   - Only completed deliveries can be rated.
   - One rating is allowed per delivery.
============================================================ */

const mongoose = require("mongoose");

const Rating = require(
  "../models/Rating"
);

const Delivery = require(
  "../models/Delivery"
);

const Traveler = require(
  "../models/Traveler"
);

/* ============================================================
   CONSTANTS
============================================================ */

const COMPLETED_DELIVERY_STATUSES = [
  "payout_pending",
  "payout_completed"
];

/* ============================================================
   NORMALIZE TEXT
============================================================ */

function normalizeText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

/* ============================================================
   NORMALIZE ROLE
============================================================ */

function normalizeRole(value) {
  return normalizeText(value)
    .toLowerCase();
}

/* ============================================================
   VALID OBJECT ID
============================================================ */

function isValidObjectId(value) {
  return mongoose.Types.ObjectId
    .isValid(value);
}

/* ============================================================
   GET REQUESTING USER
============================================================ */

function getRequestingUser(req) {
  const userId = normalizeText(
    req.headers["x-user-id"]
  );

  const userRole = normalizeRole(
    req.headers["x-user-role"]
  );

  return {
    userId,
    userRole
  };
}

/* ============================================================
   NORMALIZE SCORE
============================================================ */

function normalizeScore(value) {
  const score = Number(value);

  if (
    !Number.isInteger(score) ||
    score < 1 ||
    score > 5
  ) {
    return null;
  }

  return score;
}

/* ============================================================
   FORMAT RATING

   Produces a safe response object.
============================================================ */

function formatRating(rating) {
  if (!rating) {
    return null;
  }

  return {
    _id:
      rating._id,

    deliveryId:
      rating.deliveryId,

    senderId:
      rating.senderId,

    travelerId:
      rating.travelerId,

    score:
      rating.score,

    review:
      rating.review || "",

    createdAt:
      rating.createdAt,

    updatedAt:
      rating.updatedAt
  };
}

/* ============================================================
   CALCULATE AND UPDATE TRAVELER RATING
============================================================ */

async function updateTravelerRating(
  travelerId
) {
  const normalizedTravelerId =
    normalizeText(travelerId);

  if (
    !isValidObjectId(
      normalizedTravelerId
    )
  ) {
    throw new Error(
      "A valid Traveler ID is required."
    );
  }

  const aggregate =
    await Rating.aggregate([
      {
        $match: {
          travelerId:
            new mongoose.Types.ObjectId(
              normalizedTravelerId
            )
        }
      },

      {
        $group: {
          _id:
            "$travelerId",

          averageRating: {
            $avg:
              "$score"
          },

          ratingCount: {
            $sum:
              1
          }
        }
      }
    ]);

  const ratingSummary =
    aggregate[0] || null;

  const ratingCount =
    Number(
      ratingSummary?.ratingCount || 0
    );

  const averageRating =
    ratingCount > 0
      ? Number(
          Number(
            ratingSummary.averageRating
          ).toFixed(2)
        )
      : 5;

  const traveler =
    await Traveler.findByIdAndUpdate(
      normalizedTravelerId,

      {
        rating:
          averageRating,

        ratingCount
      },

      {
        new: true,
        runValidators: true
      }
    );

  if (!traveler) {
    throw new Error(
      "Traveler profile was not found."
    );
  }

  return {
    travelerId:
      traveler._id,

    averageRating:
      traveler.rating,

    ratingCount:
      Number(
        traveler.ratingCount || 0
      )
  };
}

/* ============================================================
   CREATE RATING

   POST /api/ratings

   Required headers:
   x-user-id
   x-user-role: sender

   Body:
   deliveryId
   score
   review (optional)
============================================================ */

async function createRating(
  req,
  res
) {
  try {
    const {
      userId,
      userRole
    } = getRequestingUser(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        error:
          "Valid user authentication is required."
      });
    }

    if (userRole !== "sender") {
      return res.status(403).json({
        success: false,

        error:
          "Only a Sender can rate a Traveler."
      });
    }

    const deliveryId =
      normalizeText(
        req.body?.deliveryId
      );

    const score =
      normalizeScore(
        req.body?.score
      );

    const review =
      normalizeText(
        req.body?.review
      );

    if (
      !deliveryId ||
      !isValidObjectId(
        deliveryId
      )
    ) {
      return res.status(400).json({
        success: false,

        error:
          "A valid delivery ID is required."
      });
    }

    if (score === null) {
      return res.status(400).json({
        success: false,

        error:
          "Rating score must be a whole number between 1 and 5."
      });
    }

    if (review.length > 1000) {
      return res.status(400).json({
        success: false,

        error:
          "Review cannot exceed 1000 characters."
      });
    }

    const delivery =
      await Delivery.findById(
        deliveryId
      );

    if (!delivery) {
      return res.status(404).json({
        success: false,

        error:
          "Delivery was not found."
      });
    }

    const deliverySenderId =
      normalizeText(
        delivery.senderId
      );

    if (
      deliverySenderId !== userId
    ) {
      return res.status(403).json({
        success: false,

        error:
          "You are not authorized to rate this delivery."
      });
    }

    if (!delivery.travelerId) {
      return res.status(400).json({
        success: false,

        error:
          "This delivery does not have an assigned Traveler."
      });
    }

    if (
      !delivery.completedAt ||
      !COMPLETED_DELIVERY_STATUSES.includes(
        delivery.status
      )
    ) {
      return res.status(400).json({
        success: false,

        error:
          "The delivery must be completed before the Traveler can be rated."
      });
    }

    const traveler =
      await Traveler.findById(
        delivery.travelerId
      );

    if (!traveler) {
      return res.status(404).json({
        success: false,

        error:
          "The assigned Traveler profile was not found."
      });
    }

    const existingRating =
      await Rating.findOne({
        deliveryId:
          delivery._id
      }).lean();

    if (existingRating) {
      return res.status(409).json({
        success: false,

        error:
          "This delivery has already been rated.",

        data:
          formatRating(
            existingRating
          )
      });
    }

    let rating = null;

    try {
      rating =
        await Rating.create({
          deliveryId:
            delivery._id,

          senderId:
            deliverySenderId,

          travelerId:
            traveler._id,

          score,

          review
        });

    } catch (error) {
      if (
        error?.code === 11000
      ) {
        const duplicateRating =
          await Rating.findOne({
            deliveryId:
              delivery._id
          }).lean();

        return res.status(409).json({
          success: false,

          error:
            "This delivery has already been rated.",

          data:
            formatRating(
              duplicateRating
            )
        });
      }

      throw error;
    }

    const travelerRating =
      await updateTravelerRating(
        traveler._id
      );

    return res.status(201).json({
      success: true,

      message:
        "Traveler rating submitted successfully.",

      data: {
        rating:
          formatRating(
            rating
          ),

        traveler:
          travelerRating
      }
    });

  } catch (error) {
    console.error(
      "Unable to create Traveler rating:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        error.message ||
        "Unable to submit the Traveler rating."
    });
  }
}

/* ============================================================
   GET RATING FOR DELIVERY

   GET /api/ratings/delivery/:deliveryId

   A Sender can retrieve only the rating associated with a
   delivery owned by that Sender.
============================================================ */

async function getRatingForDelivery(
  req,
  res
) {
  try {
    const {
      userId,
      userRole
    } = getRequestingUser(req);

    const deliveryId =
      normalizeText(
        req.params?.deliveryId
      );

    if (
      !userId ||
      userRole !== "sender"
    ) {
      return res.status(401).json({
        success: false,

        error:
          "Valid Sender authentication is required."
      });
    }

    if (
      !deliveryId ||
      !isValidObjectId(
        deliveryId
      )
    ) {
      return res.status(400).json({
        success: false,

        error:
          "A valid delivery ID is required."
      });
    }

    const delivery =
      await Delivery.findById(
        deliveryId
      )
        .select(
          "_id senderId travelerId status completedAt"
        )
        .lean();

    if (!delivery) {
      return res.status(404).json({
        success: false,

        error:
          "Delivery was not found."
      });
    }

    if (
      normalizeText(
        delivery.senderId
      ) !== userId
    ) {
      return res.status(403).json({
        success: false,

        error:
          "You are not authorized to access this delivery rating."
      });
    }

    const rating =
      await Rating.findOne({
        deliveryId:
          delivery._id
      }).lean();

    return res.json({
      success: true,

      rated:
        Boolean(rating),

      data:
        formatRating(
          rating
        )
    });

  } catch (error) {
    console.error(
      "Unable to load delivery rating:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        error.message ||
        "Unable to load the delivery rating."
    });
  }
}

/* ============================================================
   GET TRAVELER RATING SUMMARY

   GET /api/ratings/traveler/:travelerId

   Returns the Traveler aggregate and up to 20 recent ratings.
============================================================ */

async function getTravelerRatingSummary(
  req,
  res
) {
  try {
    const travelerId =
      normalizeText(
        req.params?.travelerId
      );

    if (
      !travelerId ||
      !isValidObjectId(
        travelerId
      )
    ) {
      return res.status(400).json({
        success: false,

        error:
          "A valid Traveler ID is required."
      });
    }

    const traveler =
      await Traveler.findById(
        travelerId
      )
        .select(
          "rating ratingCount totalDeliveries"
        )
        .lean();

    if (!traveler) {
      return res.status(404).json({
        success: false,

        error:
          "Traveler profile was not found."
      });
    }

    const recentRatings =
      await Rating.find({
        travelerId:
          traveler._id
      })
        .sort({
          createdAt: -1
        })
        .limit(20)
        .select(
          "deliveryId senderId travelerId score review createdAt updatedAt"
        )
        .lean();

    return res.json({
      success: true,

      data: {
        travelerId:
          traveler._id,

        averageRating:
          Number(
            traveler.rating || 5
          ),

        ratingCount:
          Number(
            traveler.ratingCount || 0
          ),

        totalDeliveries:
          Number(
            traveler.totalDeliveries || 0
          ),

        ratings:
          recentRatings.map(
            formatRating
          )
      }
    });

  } catch (error) {
    console.error(
      "Unable to load Traveler rating summary:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        error.message ||
        "Unable to load the Traveler rating summary."
    });
  }
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  createRating,
  getRatingForDelivery,
  getTravelerRatingSummary,
  updateTravelerRating
};