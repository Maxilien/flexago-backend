// controllers/deliveryController.js
// ------------------------------------------------------
// Flexago Marketplace Delivery Controller
// ------------------------------------------------------

const crypto = require("crypto");
const Delivery = require("../models/Delivery");
const serviceArea = require("../utils/serviceArea");
const UserBlock = require("../models/UserBlock");
const {
  uploadImage,
  storeUploadedFile
} = require("../utils/imageUpload");
const {
  calculatePrice,
  resolveDistanceMiles
} = require("../utils/pricing");
const {
  RewardError,
  reserveDiscount,
  undoReservation
} = require("../utils/rewards");

// Route matching: how far a stop may be from the traveler's road,
// and the wider area allowed around the start and destination.
const ROUTE_CORRIDOR_MILES = 6;
const ROUTE_END_ZONE_MILES = 20;
const ROUTE_DIRECTION_TOLERANCE_MILES = 0.5;
const MAX_PACKAGE_PHOTOS = 5;

// Wrong pickup codes allowed before verification pauses.
const MAX_PICKUP_ATTEMPTS = 5;
const PICKUP_LOCK_MS = 15 * 60 * 1000;
const Traveler = require("../models/Traveler");

const {
  processTravelerPayment
} = require("./paymentController");

const {
  sendDeliveryAcceptedEmail,
  sendPickupVerifiedEmail,
  sendDeliveryCompletedEmail
} = require("../utils/emailService");

const {
  sendDeliveryAcceptedSms,
  sendPickupVerifiedSms,
  sendDeliveryCompletedSms
} = require("../utils/smsService");

console.log(
  "🟢 Flexago Marketplace Delivery Controller Loaded"
);

/* ============================================================
   GEO HELPERS
============================================================ */

const EARTH_RADIUS_MILES = 3958.8;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineMiles(a, b) {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const lat1Radians = toRad(lat1);
  const lat2Radians = toRad(lat2);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1Radians) *
      Math.cos(lat2Radians) *
      sinDLng *
      sinDLng;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(h),
      Math.sqrt(1 - h)
    );

  return EARTH_RADIUS_MILES * c;
}

// Finds where a point sits along a route: how far it is from the
// road, and how many miles into the trip that closest spot is.
function locateOnRoute(point, polyline) {
  const milesPerDegreeLng = Math.cos((point[1] * Math.PI) / 180);

  let closest = { offRouteMiles: Infinity, progressMiles: 0 };
  let travelled = 0;

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const start = polyline[index];
    const end = polyline[index + 1];

    const segmentX = (end[0] - start[0]) * milesPerDegreeLng;
    const segmentY = end[1] - start[1];
    const pointX = (point[0] - start[0]) * milesPerDegreeLng;
    const pointY = point[1] - start[1];

    const lengthSquared = segmentX * segmentX + segmentY * segmentY;

    const ratio = lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, (pointX * segmentX + pointY * segmentY) / lengthSquared)
        );

    const nearest = [
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio
    ];

    const offRouteMiles = haversineMiles(point, nearest);
    const segmentMiles = haversineMiles(start, end);

    if (offRouteMiles < closest.offRouteMiles) {
      closest = {
        offRouteMiles,
        progressMiles: travelled + segmentMiles * ratio
      };
    }

    travelled += segmentMiles;
  }

  return closest;
}

/* ============================================================
   COORDINATE VALIDATION
============================================================ */

function validCoordinates(coordinates) {
  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2
  ) {
    return false;
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

/* ============================================================
   NORMALIZE GEO POINT
============================================================ */

function normalizeGeoPoint(raw) {
  if (!raw) {
    return null;
  }

  const coordinates =
    raw.location?.coordinates ||
    raw.coordinates;

  if (!validCoordinates(coordinates)) {
    return null;
  }

  return {
    address: String(raw.address || "").trim(),

    location: {
      type: "Point",
      coordinates: [
        Number(coordinates[0]),
        Number(coordinates[1])
      ]
    },

    contactName: raw.contactName || "",
    contactPhone: raw.contactPhone || "",
    instructions: raw.instructions || ""
  };
}

/* ============================================================
   CREATE DELIVERY

   Delivery starts as payment_pending.
   Sender payment must succeed before the job becomes available.
============================================================ */

async function createDelivery(req, res) {
  console.log("🔥 CREATE DELIVERY CONTROLLER HIT");

  try {
    const {
      pickup: rawPickup,
      dropoff: rawDropoff,
      package: packageData,
      sender,
      receiver,
      notes,
      distanceMiles,
      insuranceType,
      itemConfirmed
    } = req.body;

    if (itemConfirmed !== true) {
      return res.status(400).json({
        success: false,
        error: "Please confirm your item is allowed."
      });
    }

    // The sender is whoever is logged in, never the request body.
    const senderId = req.user.id;

    const pickup =
      normalizeGeoPoint(rawPickup);

    const dropoff =
      normalizeGeoPoint(rawDropoff);

    if (!pickup || !dropoff) {
      return res.status(400).json({
        success: false,
        error: "Invalid pickup or drop-off coordinates."
      });
    }

    if (!pickup.address) {
      return res.status(400).json({
        success: false,
        error: "Pickup address is required."
      });
    }

    if (!dropoff.address) {
      return res.status(400).json({
        success: false,
        error: "Drop-off address is required."
      });
    }

    // Launch area: both ends must be inside it (Texas only for now).
    const area = serviceArea.describe();
    const placeInfo = (raw, point) => ({
      ...point,
      state: raw?.state,
      country: raw?.country
    });

    if (
      !serviceArea.placeAllowed(placeInfo(rawPickup, pickup)) ||
      !serviceArea.placeAllowed(placeInfo(rawDropoff, dropoff))
    ) {
      return res.status(400).json({
        success: false,
        code: "OUTSIDE_SERVICE_AREA",
        error: serviceArea.outsideMessage()
      });
    }

    if (
      area.limited &&
      packageData?.deliveryType &&
      !area.deliveryTypes.includes(packageData.deliveryType)
    ) {
      return res.status(400).json({
        success: false,
        code: "OUTSIDE_SERVICE_AREA",
        error: `Only local deliveries within ${area.name} are available for now.`
      });
    }

    // Priced on the server. Any price sent by the app is ignored.
    const { price: roundedPrice, payoutAmount } = calculatePrice({
      deliveryType: packageData?.deliveryType,
      distanceMiles: resolveDistanceMiles(
        distanceMiles,
        haversineMiles(
          pickup.location.coordinates,
          dropoff.location.coordinates
        )
      ),
      weight: packageData?.weight,
      declaredValue: packageData?.declaredValue,
      packageType: packageData?.type,
      size: packageData?.size,
      insuranceType
    });

    if (roundedPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: "Unable to price this delivery. Check the delivery type and addresses."
      });
    }

    const submittedPhotos = Array.isArray(packageData?.photos)
      ? packageData.photos
      : packageData?.photoUrl
        ? [packageData.photoUrl]
        : [];

    if (submittedPhotos.length > MAX_PACKAGE_PHOTOS) {
      return res.status(400).json({
        success: false,
        error: `You can add up to ${MAX_PACKAGE_PHOTOS} photos.`
      });
    }

    let photoUrls = [];

    try {
      photoUrls = await Promise.all(
        submittedPhotos.map((photo) =>
          uploadImage(photo, "flexago/deliveries")
        )
      );
    } catch (uploadError) {
      console.error("Photo upload failed:", uploadError.message);

      return res.status(400).json({
        success: false,
        error: "One of your photos could not be uploaded. Please try again."
      });
    }

    const resolvedPhotoUrl = photoUrls[0] || null;

    // Promo code and saved credit come off FlexaGo's share only.
    let savings;
    try {
      savings = await reserveDiscount({
        senderId,
        promoCode: String(req.body.promoCode || "").trim(),
        price: roundedPrice,
        payoutAmount
      });
    } catch (error) {
      if (error instanceof RewardError) {
        return res.status(400).json({ success: false, error: error.message });
      }
      throw error;
    }

    const finalPrice =
      Math.round((roundedPrice - savings.discount) * 100) / 100;

    let delivery;
    try {
      delivery =
      await Delivery.create({
        senderId: String(senderId),
        itemConfirmedAt: new Date(),

        sender: {
          name: sender?.name || "",
          phone: sender?.phone || "",
          email: sender?.email || ""
        },

        receiver: {
          name: receiver?.name || "",
          phone: receiver?.phone || "",
          instructions:
            receiver?.instructions || ""
        },

        pickup,
        dropoff,

        package: {
          type:
            packageData?.type || "",

          weight:
            packageData?.weight !== undefined &&
            packageData?.weight !== null &&
            packageData?.weight !== ""
              ? Number(packageData.weight)
              : null,

          size:
            packageData?.size || "",

          insurance:
            Boolean(packageData?.insurance),

          deliveryType:
            packageData?.deliveryType || "",

          description:
            packageData?.description || "",

          declaredValue:
            packageData?.declaredValue !== undefined &&
            packageData?.declaredValue !== null &&
            packageData?.declaredValue !== ""
              ? Number(packageData.declaredValue)
              : null,

          photoUrl:
            resolvedPhotoUrl,

          photoUrls
        },

        notes:
          notes || "",

        price:
          finalPrice,

        listPrice:
          roundedPrice,

        discount:
          savings.discount,

        promoCode:
          savings.promoCode,

        promoAmount:
          savings.promoAmount,

        creditUsed:
          savings.creditUsed,

        payoutAmount,

        currency:
          "usd",

        status:
          "payment_pending",

        paymentStatus:
          "pending",

        payoutStatus:
          "pending",

        amountCharged:
          0,

        fundedAt:
          null,

        paymentFailedAt:
          null,

        payoutFailedAt:
          null,

        stripePaymentIntentId:
          null,

        stripeChargeId:
          null,

        stripeTransferId:
          null,

        transferGroup:
          null
      });
    } catch (error) {
      await undoReservation(senderId, savings);
      throw error;
    }

    return res.status(201).json({
      success: true,

      message:
        "Delivery created. Payment confirmation is required before the job becomes available.",

      data: delivery,

      paymentRequired: true,

      paymentEndpoint:
        "/api/payments/create-delivery-payment"
    });
  } catch (error) {
    console.error(
      "❌ Create Delivery Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Unable to create delivery"
    });
  }
}

/* ============================================================
   SEARCH TRAVELER JOBS

   Travelers see only funded and available deliveries.
============================================================ */

async function searchTravelerJobs(req, res) {
  try {
    const {
      start,
      destination,
      route,
      deliveryType
    } = req.body;

    if (!start || !destination) {
      return res.status(400).json({
        success: false,
        error: "Start and destination are required."
      });
    }

    const startPoint = [
      Number(start.lng),
      Number(start.lat)
    ];

    const destinationPoint = [
      Number(destination.lng),
      Number(destination.lat)
    ];

    if (
      !validCoordinates(startPoint) ||
      !validCoordinates(destinationPoint)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid traveler route coordinates."
      });
    }

    let polyline = [];

    if (
      Array.isArray(route) &&
      route.length >= 2
    ) {
      polyline = route
        .map(([longitude, latitude]) => [
          Number(longitude),
          Number(latitude)
        ])
        .filter(validCoordinates);
    }

    // Without a drawn route, use the straight line between the two points.
    if (polyline.length < 2) {
      polyline = [startPoint, destinationPoint];
    }

    const query = {
      status: "available",
      paymentStatus: "paid",
      declinedBy: { $ne: req.user.id },
      senderId: { $nin: await UserBlock.idsHiddenFrom(req.user.id) }
    };

    if (deliveryType) {
      query["package.deliveryType"] =
        deliveryType;
    }

    const deliveries =
      await Delivery.find(query).lean();

    const matched = deliveries
      .map((job) => {
        const pickupCoordinates =
          job.pickup?.location?.coordinates;

        const dropoffCoordinates =
          job.dropoff?.location?.coordinates;

        if (
          !validCoordinates(pickupCoordinates) ||
          !validCoordinates(dropoffCoordinates)
        ) {
          return null;
        }

        const pickupStartDistance =
          haversineMiles(
            pickupCoordinates,
            startPoint
          );

        const dropoffDestinationDistance =
          haversineMiles(
            dropoffCoordinates,
            destinationPoint
          );

        const pickupOnRoad =
          locateOnRoute(pickupCoordinates, polyline);

        const dropoffOnRoad =
          locateOnRoute(dropoffCoordinates, polyline);

        // These limits live on the server so the app can't widen them.
        const pickupAllowed =
          pickupOnRoad.offRouteMiles <= ROUTE_CORRIDOR_MILES ||
          pickupStartDistance <= ROUTE_END_ZONE_MILES;

        const dropoffAllowed =
          dropoffOnRoad.offRouteMiles <= ROUTE_CORRIDOR_MILES ||
          dropoffDestinationDistance <= ROUTE_END_ZONE_MILES;

        // The traveler must reach the pickup before the drop-off.
        const sameDirection =
          pickupOnRoad.progressMiles <=
          dropoffOnRoad.progressMiles + ROUTE_DIRECTION_TOLERANCE_MILES;

        const matches =
          pickupAllowed &&
          dropoffAllowed &&
          sameDirection;

        if (!matches) {
          return null;
        }

        const {
          pickupCode,
          pickupQR,
          declinedBy,
          ...publicJob
        } = job;

        return {
          ...publicJob,

          sender: { name: job.sender?.name || "" },

          receiver: { name: job.receiver?.name || "" },

          pickup: {
            ...job.pickup,
            contactPhone: ""
          },

          dropoff: {
            ...job.dropoff,
            contactPhone: ""
          },

          _distance: {
            offRouteMiles: Math.max(
              pickupOnRoad.offRouteMiles,
              dropoffOnRoad.offRouteMiles
            )
          }
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        a._distance.offRouteMiles - b._distance.offRouteMiles
      );

    return res.json({
      success: true,
      count: matched.length,
      data: matched
    });
  } catch (error) {
    console.error(
      "❌ Search Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Search failed"
    });
  }
}

/* ============================================================
   ACCEPT TRAVELER JOB

   Accepts either:
   - User._id
   - Traveler._id

   The backend resolves the authoritative Traveler profile,
   stores Traveler._id on the delivery, and snapshots only
   sender-safe traveler information.
============================================================ */

async function acceptTravelerJob(req, res) {
  try {
    const { jobId } =
      req.params;

    // The traveler is whoever is logged in, never the request body.
    const requestedTravelerId =
      req.user.id;

    const job =
      await Delivery.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found"
      });
    }

    if (job.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,

        error:
          "Job payment has not been funded"
      });
    }

    if (job.status !== "available") {
      return res.status(400).json({
        success: false,

        error:
          "Job is no longer available"
      });
    }

    /*
     * Support either:
     * - User._id
     * - Traveler._id
     */
    const traveler =
      await Traveler.findOne({
        $or: [
          {
            _id:
              requestedTravelerId
          },
          {
            user:
              requestedTravelerId
          }
        ]
      }).populate(
        "user",
        "firstName lastName"
      );

    if (!traveler) {
      return res.status(404).json({
        success: false,

        error:
          "Traveler profile not found"
      });
    }

    if (!traveler.user) {
      return res.status(400).json({
        success: false,

        error:
          "Traveler user account is missing"
      });
    }

    if (req.user.user.background_status !== "clear") {
      return res.status(403).json({
        success: false,
        code: "BACKGROUND_CHECK_REQUIRED",
        error: "Complete your background check before accepting jobs."
      });
    }

    if (await UserBlock.between(job.senderId, traveler.user._id)) {
      return res.status(403).json({
        success: false,
        error: "This job is not available."
      });
    }

    const firstName =
      String(
        traveler.user.firstName || ""
      ).trim();

    const lastName =
      String(
        traveler.user.lastName || ""
      ).trim();

    if (!firstName && !lastName) {
      return res.status(400).json({
        success: false,

        error:
          "Traveler name is missing from the user account"
      });
    }

    const travelerName =
      `${firstName} ${lastName}`.trim();

    /*
     * Store the authoritative
     * Traveler profile ID.
     */
    job.travelerId =
      traveler._id;

    /*
     * Store only sender-safe
     * traveler information.
     */
    job.travelerDetails = {
      firstName,
      lastName,

      rating:
        Number.isFinite(
          Number(traveler.rating)
        )
          ? Number(traveler.rating)
          : 5,

      totalDeliveries:
        Number(
          traveler.totalDeliveries || 0
        )
    };

    // Unpredictable 6-digit code (100000 to 999999).
    job.pickupCode =
      crypto
        .randomInt(100000, 1000000)
        .toString();

    job.pickupAttempts = 0;
    job.pickupLockedUntil = undefined;

    job.pickupQR =
      crypto
        .randomBytes(16)
        .toString("hex");

    job.pickupVerified =
      false;

    job.status =
      "accepted";

    job.acceptedAt =
      new Date();

    /*
     * Save the accepted delivery before
     * attempting notifications.
     */
    await job.save();

    const fullJob =
      await Delivery.findById(
        job._id
      ).lean();

    console.log(
      "✅ Traveler accepted delivery:",
      {
        deliveryId:
          job._id.toString(),

        travelerId:
          traveler._id.toString(),

        travelerUserId:
          traveler.user._id.toString(),

        firstName,
        lastName,

        rating:
          job.travelerDetails.rating
      }
    );

    /*
     * ------------------------------------------------------
     * ACCEPTED EMAIL NOTIFICATION
     *
     * Email failure does not undo
     * the accepted delivery.
     * ------------------------------------------------------
     */

    if (job.sender?.email) {
      const emailSent =
        await sendDeliveryAcceptedEmail({
          to:
            job.sender.email,

          deliveryId:
            job._id.toString(),

          travelerName
        });

      if (!emailSent) {
        console.warn(
          "⚠️ Delivery accepted email was not sent:",
          job._id.toString()
        );
      }
    } else {
      console.warn(
        "⚠️ Delivery accepted email skipped because sender email is missing:",
        job._id.toString()
      );
    }

    /*
     * ------------------------------------------------------
     * ACCEPTED SMS NOTIFICATION
     *
     * SMS failure does not undo:
     * - Delivery acceptance
     * - Pickup-code generation
     * - Email notification
     * ------------------------------------------------------
     */

    if (job.sender?.phone) {
      const smsSent =
        await sendDeliveryAcceptedSms({
          to:
            job.sender.phone,

          deliveryId:
            job._id.toString(),

          travelerName
        });

      if (!smsSent) {
        console.warn(
          "⚠️ Delivery accepted SMS was not sent:",
          job._id.toString()
        );
      }
    } else {
      console.warn(
        "⚠️ Delivery accepted SMS skipped because sender phone is missing:",
        job._id.toString()
      );
    }

    // The sender gives this code at pickup, so the traveler must not get it here.
    const { pickupCode, pickupQR, ...travelerJob } = fullJob;

    return res.json({
      success: true,
      data: travelerJob
    });
  } catch (error) {
    console.error(
      "❌ Accept Job Error:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        error.message ||
        "Unable to accept delivery"
    });
  }
}
/* ============================================================
   VERIFY PICKUP CODE OR QR
============================================================ */

// Compares without leaking how much of the value was right.
function sameSecret(expected, provided) {
  if (!expected) return false;
  const hash = (value) =>
    crypto.createHash("sha256").update(String(value)).digest();
  return crypto.timingSafeEqual(hash(expected), hash(provided));
}

// Counts one try. Returns null while verification is paused.
// Reaching the limit starts a 15-minute pause in the same update,
// so parallel requests cannot get extra tries.
async function reservePickupAttempt(jobId) {
  const now = new Date();

  await Delivery.updateOne(
    { _id: jobId, pickupLockedUntil: { $lte: now } },
    { $set: { pickupAttempts: 0 }, $unset: { pickupLockedUntil: 1 } }
  );

  return Delivery.findOneAndUpdate(
    {
      _id: jobId,
      $or: [
        { pickupAttempts: { $exists: false } },
        { pickupAttempts: { $lt: MAX_PICKUP_ATTEMPTS } }
      ]
    },
    [
      {
        $set: {
          pickupAttempts: {
            $add: [{ $ifNull: ["$pickupAttempts", 0] }, 1]
          }
        }
      },
      {
        $set: {
          pickupLockedUntil: {
            $cond: [
              { $gte: ["$pickupAttempts", MAX_PICKUP_ATTEMPTS] },
              new Date(now.getTime() + PICKUP_LOCK_MS),
              "$pickupLockedUntil"
            ]
          }
        }
      }
    ],
    { new: true }
  ).lean();
}

async function minutesUntilUnlock(jobId) {
  const job = await Delivery.findById(jobId)
    .select("pickupLockedUntil")
    .lean();
  const ms = job?.pickupLockedUntil
    ? new Date(job.pickupLockedUntil).getTime() - Date.now()
    : PICKUP_LOCK_MS;
  return Math.max(1, Math.ceil(ms / 60000));
}

async function verifyPickupCode(req, res) {
  try {
    const { jobId } = req.params;
    const { code, qr } = req.body;

    const job =
      await Delivery.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found"
      });
    }

    if (job.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        error:
          "Delivery payment has not been funded"
      });
    }

    if (job.status !== "accepted") {
      return res.status(400).json({
        success: false,
        error:
          "Delivery is not ready for pickup verification"
      });
    }

    const providedCode =
      code !== undefined &&
      code !== null
        ? String(code).trim()
        : "";

    const providedQr =
      qr !== undefined &&
      qr !== null
        ? String(qr).trim()
        : "";

    // Every try counts, so the code cannot be guessed.
    const attempt =
      await reservePickupAttempt(job._id);

    if (!attempt) {
      return res.status(429).json({
        success: false,
        error:
          "Too many wrong codes. Try again in " +
          (await minutesUntilUnlock(job._id)) +
          " minutes, or contact the sender."
      });
    }

    const codeMatches =
      Boolean(providedCode) &&
      sameSecret(job.pickupCode, providedCode);

    const qrMatches =
      Boolean(providedQr) &&
      sameSecret(job.pickupQR, providedQr);

    if (!codeMatches && !qrMatches) {
      const left = Math.max(
        MAX_PICKUP_ATTEMPTS - attempt.pickupAttempts,
        0
      );

      return res.status(left ? 400 : 429).json({
        success: false,
        attemptsLeft: left,
        error: left
          ? `Wrong pickup code. ${left} ${left === 1 ? "try" : "tries"} left.`
          : "Too many wrong codes. Try again in 15 minutes, or contact the sender."
      });
    }

    job.pickupAttempts = 0;
    job.pickupLockedUntil = undefined;
    job.pickupVerified = true;
    job.status = "in_transit";
    job.pickedUpAt = new Date();

    await job.save();

    /*
     * Notify sender that pickup
     * has been successfully verified.
     *
     * Email failure does not affect
     * the delivery state.
     */
    if (job.sender?.email) {
      const notificationSent =
        await sendPickupVerifiedEmail({
          to: job.sender.email,

          deliveryId:
            job._id.toString()
        });

      if (!notificationSent) {
        console.warn(
          "⚠️ Pickup verified email was not sent:",
          job._id.toString()
        );
      }
    } else {
      console.warn(
        "⚠️ Pickup verified email skipped because sender email is missing:",
        job._id.toString()
      );
    }

    return res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error(
      "❌ Verify Pickup Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
}
/* ============================================================
   PICKUP JOB
============================================================ */

async function pickupTravelerJob(req, res) {
  try {
    const { jobId } = req.params;

    const job =
      await Delivery.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found"
      });
    }

    if (job.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        error: "Delivery payment has not been funded"
      });
    }

    if (job.status === "in_transit") {
      return res.json({
        success: true,
        alreadyPickedUp: true,
        data: job
      });
    }

    if (job.status !== "accepted") {
      return res.status(400).json({
        success: false,
        error: "Delivery is not ready for pickup"
      });
    }

    if (!job.pickupVerified) {
      return res.status(400).json({
        success: false,
        error: "Pickup verification is required"
      });
    }

    job.status = "in_transit";
    job.pickedUpAt =
      job.pickedUpAt ||
      new Date();

    await job.save();

    return res.json({
      success: true,
      alreadyPickedUp: false,
      data: job
    });
  } catch (error) {
    console.error(
      "❌ Pickup Job Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
}


/* ============================================================
   DELIVER JOB
============================================================ */
async function deliverTravelerJob(req, res) {
  try {
    const { jobId } =
      req.params;

    const job =
      await Delivery.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found"
      });
    }

    if (job.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        error:
          "Delivery payment has not been funded"
      });
    }

    if (job.status !== "in_transit") {
      return res.status(400).json({
        success: false,
        error:
          "Delivery must be in transit before it can be delivered"
      });
    }

    if (!job.pickupVerified) {
      return res.status(400).json({
        success: false,
        error:
          "Pickup was not verified"
      });
    }

    job.status =
      "delivered";

    job.deliveredAt =
      new Date();

    await job.save();

    console.log(
      "✅ Delivery marked as delivered:",
      job._id.toString()
    );

    return res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error(
      "❌ Deliver Job Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
}
/* ============================================================
   COMPLETE TRAVELER JOB

   Accepts proof of delivery from the final completion modal:
   - signedBy
   - photo
   - signature

   Moves:
   in_transit or delivered
   ↓
   payout_pending

   Automatic traveler payout runs after completion.
============================================================ */

async function completeTravelerJob(
  req,
  res
) {
  console.log(
    "🔥 COMPLETE TRAVELER JOB HIT:",
    req.originalUrl
  );

  try {
    const { jobId } =
      req.params;

    console.log(
      "📦 Completing delivery:",
      jobId
    );

    const signedBy =
      String(
        req.body?.signedBy || ""
      ).trim();

    const photoFile =
      req.files?.photo?.[0] ||
      null;

    const signatureFile =
      req.files?.signature?.[0] ||
      null;

    const job =
      await Delivery.findById(
        jobId
      );

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found"
      });
    }
    /*
     * ------------------------------------------------------
     * AUTHORIZED TRAVELER VERIFICATION
     *
     * Only the authenticated traveler assigned to this
     * delivery can complete it and trigger payment release.
     * ------------------------------------------------------
     */

    if (
      !req.user ||
      req.user.role !== "traveler"
    ) {
      return res.status(403).json({
        success: false,
        error:
          "Only authenticated travelers can complete deliveries"
      });
    }

    const authenticatedTraveler =
      await Traveler.findOne({
        user: req.user.id
      });

    if (!authenticatedTraveler) {
      return res.status(403).json({
        success: false,
        error:
          "Traveler profile was not found"
      });
    }

    if (
      !job.travelerId ||
      job.travelerId.toString() !==
        authenticatedTraveler._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        error:
          "You are not assigned to this delivery"
      });
    }
    if (
      job.paymentStatus !== "paid"
    ) {
      return res.status(400).json({
        success: false,

        error:
          "Delivery payment has not been funded"
      });
    }

    if (
      job.status !== "in_transit" &&
      job.status !== "delivered"
    ) {
      return res.status(400).json({
        success: false,

        error:
          "Delivery must be in transit before completion"
      });
    }

    if (!job.pickupVerified) {
      return res.status(400).json({
        success: false,

        error:
          "Pickup was not verified"
      });
    }

    if (!signedBy) {
      return res.status(400).json({
        success: false,

        error:
          "Recipient name is required"
      });
    }

    if (!photoFile) {
      return res.status(400).json({
        success: false,

        error:
          "Delivery photo is required"
      });
    }

    if (!signatureFile) {
      return res.status(400).json({
        success: false,

        error:
          "Recipient signature is required"
      });
    }

    const backendBaseUrl =
      process.env.BACKEND_URL ||
      `${req.protocol}://${req.get(
        "host"
      )}`;

    const proofFiles =
      req.files?.photo || [];

    const proofPhotoUrls =
      await Promise.all(
        proofFiles.map((file) =>
          storeUploadedFile(
            file,
            "flexago/proof",
            backendBaseUrl
          )
        )
      );

    const proofPhotoUrl =
      proofPhotoUrls[0];

    const signatureUrl =
      await storeUploadedFile(
        signatureFile,
        "flexago/proof",
        backendBaseUrl
      );

    job.signedBy =
      signedBy;

    job.proofPhoto =
      proofPhotoUrl;

    job.proofPhotos =
      proofPhotoUrls;

    job.signatureUrl =
      signatureUrl;

    job.deliveredAt =
      job.deliveredAt ||
      new Date();

    job.completedAt =
      new Date();

    job.status =
      "payout_pending";

    job.payoutStatus =
      "pending";

    /*
     * Save completion and proof before
     * attempting notifications or payout.
     */
    await job.save();

    console.log(
      "✅ Delivery completed:",
      job._id.toString()
    );

    console.log(
      "✅ Proof photo:",
      job.proofPhoto
    );

    console.log(
      "✅ Signature:",
      job.signatureUrl
    );

    /*
     * ------------------------------------------------------
     * DELIVERY COMPLETED EMAIL
     *
     * Email failure must not reverse
     * delivery completion.
     * ------------------------------------------------------
     */

    console.log(
      "📧 About to send delivery completed email:",
      {
        deliveryId:
          job._id.toString(),

        senderEmail:
          job.sender?.email || null,

        signedBy:
          job.signedBy
      }
    );

    if (job.sender?.email) {
      const emailSent =
        await sendDeliveryCompletedEmail({
          to:
            job.sender.email,

          deliveryId:
            job._id.toString(),

          signedBy:
            job.signedBy
        });

      if (emailSent) {
        console.log(
          "✅ Delivery completed email confirmed:",
          job._id.toString()
        );
      } else {
        console.warn(
          "⚠️ Delivery completed email was not sent:",
          job._id.toString()
        );
      }
    } else {
      console.warn(
        "⚠️ Delivery completed email skipped because sender email is missing:",
        job._id.toString()
      );
    }

    /*
     * ------------------------------------------------------
     * DELIVERY COMPLETED SMS
     *
     * SMS failure must not affect:
     * - Delivery completion
     * - Proof of delivery
     * - Completed email
     * - Traveler payout
     * ------------------------------------------------------
     */

    if (job.sender?.phone) {
      const smsSent =
        await sendDeliveryCompletedSms({
          to:
            job.sender.phone,

          deliveryId:
            job._id.toString(),

          signedBy:
            job.signedBy
        });

      if (smsSent) {
        console.log(
          "✅ Delivery completed SMS confirmed:",
          job._id.toString()
        );
      } else {
        console.warn(
          "⚠️ Delivery completed SMS was not sent:",
          job._id.toString()
        );
      }
    } else {
      console.warn(
        "⚠️ Delivery completed SMS skipped because sender phone is missing:",
        job._id.toString()
      );
    }

    /*
     * ------------------------------------------------------
     * AUTOMATIC TRAVELER PAYOUT
     * ------------------------------------------------------
     */

    let payoutResult = null;
    let payoutError = null;

    try {
      payoutResult =
        await processTravelerPayment(
          job._id
        );

      console.log(
        "✅ Automatic traveler payout completed:",
        payoutResult
      );
    } catch (error) {
      payoutError =
        error.message;

      console.error(
        "❌ Automatic traveler payout failed:",
        error
      );

      /*
       * Proof of delivery remains saved.
       * The payout can be retried manually.
       */
    }

    /*
     * Reload because processTravelerPayment()
     * may have changed the delivery status
     * to payout_completed.
     */

    const updatedJob =
      await Delivery.findById(
        job._id
      );

    return res.json({
      success: true,

      message:
        payoutResult
          ? "Delivery completed and traveler payout processed."
          : "Delivery completed. Traveler payout requires review.",

      data:
        updatedJob || job,

      payoutProcessed:
        Boolean(payoutResult),

      payoutResult,

      payoutError
    });
  } catch (error) {
    console.error(
      "❌ Complete Job Error:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        error.message ||
        "Unable to complete delivery"
    });
  }
}
/* ============================================================
   PAYOUT JOB STATUS

   Real payout runs through POST /api/payments/release.
============================================================ */

async function payoutTravelerJob(req, res) {
  try {
    const { jobId } = req.params;

    const job =
      await Delivery.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found"
      });
    }

    if (
      job.stripeTransferId &&
      job.payoutStatus === "completed"
    ) {
      return res.json({
        success: true,
        alreadyPaid: true,

        message:
          "Traveler payout has already been completed.",

        stripeTransferId:
          job.stripeTransferId,

        data: job
      });
    }

    return res.status(409).json({
      success: false,
      alreadyPaid: false,

      error:
        "Traveler payout must be released through the payment release endpoint.",

      payoutEndpoint:
        "/api/payments/release"
    });
  } catch (error) {
    console.error(
      "❌ Payout Job Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
}

/* ============================================================
   EXPORT CONTROLLER
============================================================ */

module.exports = {
  createDelivery,
  searchTravelerJobs,
  acceptTravelerJob,
  pickupTravelerJob,
  deliverTravelerJob,
  completeTravelerJob,
  payoutTravelerJob,
  verifyPickupCode
};
