// controllers/deliveryController.js
// ------------------------------------------------------
// Flexago Marketplace Delivery Controller
// ------------------------------------------------------

const crypto = require("crypto");
const Delivery = require("../models/Delivery");
const Traveler = require("../models/Traveler");

console.log("🟢 Flexago Marketplace Delivery Controller Loaded");

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

function distancePointToSegmentMiles(point, start, end) {
  const [px, py] = point;
  const [ax, ay] = start;
  const [bx, by] = end;

  const segment = [bx - ax, by - ay];
  const pointVector = [px - ax, py - ay];

  const segmentLengthSquared =
    segment[0] * segment[0] +
    segment[1] * segment[1];

  if (segmentLengthSquared === 0) {
    return haversineMiles(point, start);
  }

  const projection =
    pointVector[0] * segment[0] +
    pointVector[1] * segment[1];

  let ratio =
    projection / segmentLengthSquared;

  ratio = Math.max(
    0,
    Math.min(1, ratio)
  );

  const closestPoint = [
    ax + segment[0] * ratio,
    ay + segment[1] * ratio
  ];

  return haversineMiles(
    point,
    closestPoint
  );
}

function distancePointToPolylineMiles(point, polyline) {
  if (
    !Array.isArray(polyline) ||
    polyline.length < 2
  ) {
    return Infinity;
  }

  let minimumDistance = Infinity;

  for (
    let index = 0;
    index < polyline.length - 1;
    index += 1
  ) {
    const distance =
      distancePointToSegmentMiles(
        point,
        polyline[index],
        polyline[index + 1]
      );

    if (distance < minimumDistance) {
      minimumDistance = distance;
    }
  }

  return minimumDistance;
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
      price,
      senderId
    } = req.body;

    if (!senderId) {
      return res.status(400).json({
        success: false,
        error: "senderId is required"
      });
    }

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

    const numericPrice = Number(price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Delivery price must be greater than zero."
      });
    }

    const roundedPrice =
      Math.round(numericPrice * 100) / 100;

    const payoutAmount =
      Math.round(roundedPrice * 0.8 * 100) / 100;

    let resolvedPhotoUrl = null;

    if (
      packageData?.photoUrl &&
      packageData.photoUrl.startsWith("data:")
    ) {
      try {
        const cloudinary =
          require("cloudinary").v2;

        cloudinary.config({
          cloud_name:
            process.env.CLOUDINARY_CLOUD_NAME,

          api_key:
            process.env.CLOUDINARY_API_KEY,

          api_secret:
            process.env.CLOUDINARY_API_SECRET
        });

        const uploaded =
          await cloudinary.uploader.upload(
            packageData.photoUrl,
            {
              folder: "flexago/deliveries",
              transformation: [
                {
                  width: 800,
                  quality: "auto"
                }
              ]
            }
          );

        resolvedPhotoUrl = uploaded.secure_url;

        console.log(
          "✅ Photo uploaded to Cloudinary:",
          resolvedPhotoUrl
        );
      } catch (uploadError) {
        console.error(
          "❌ Cloudinary upload failed:",
          uploadError.message
        );

        resolvedPhotoUrl = null;
      }
    } else if (
      typeof packageData?.photoUrl === "string"
    ) {
      resolvedPhotoUrl =
        packageData.photoUrl;
    }

    const delivery =
      await Delivery.create({
        senderId: String(senderId),

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
            resolvedPhotoUrl
        },

        notes:
          notes || "",

        price:
          roundedPrice,

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
      maxMiles = 5,
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

    const parsedMaxMiles =
      Number(maxMiles);

    const allowedMiles =
      Number.isFinite(parsedMaxMiles) &&
      parsedMaxMiles > 0
        ? parsedMaxMiles
        : 5;

    const query = {
      status: "available",
      paymentStatus: "paid"
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

        const pickupRouteDistance =
          distancePointToPolylineMiles(
            pickupCoordinates,
            polyline
          );

        const dropoffRouteDistance =
          distancePointToPolylineMiles(
            dropoffCoordinates,
            polyline
          );

        const matches =
          polyline.length < 2
            ? pickupStartDistance <= allowedMiles &&
              dropoffDestinationDistance <= allowedMiles
            : (
                pickupStartDistance <= allowedMiles ||
                pickupRouteDistance <= allowedMiles
              ) &&
              (
                dropoffDestinationDistance <= allowedMiles ||
                dropoffRouteDistance <= allowedMiles
              );

        if (!matches) {
          return null;
        }

        return {
          ...job,

          _distance: {
            pickupStartMiles:
              pickupStartDistance,

            dropoffDestMiles:
              dropoffDestinationDistance,

            pickupRouteMiles:
              pickupRouteDistance,

            dropoffRouteMiles:
              dropoffRouteDistance
          }
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aDistance =
          a._distance.pickupStartMiles +
          a._distance.dropoffDestMiles +
          a._distance.pickupRouteMiles +
          a._distance.dropoffRouteMiles;

        const bDistance =
          b._distance.pickupStartMiles +
          b._distance.dropoffDestMiles +
          b._distance.pickupRouteMiles +
          b._distance.dropoffRouteMiles;

        return aDistance - bDistance;
      });

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
    const { jobId } = req.params;

    const requestedTravelerId =
      req.body?.travelerId;

    if (!requestedTravelerId) {
      return res.status(400).json({
        success: false,
        error: "Missing travelerId"
      });
    }

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
     * The frontend currently sends User._id.
     * Support both User._id and Traveler._id.
     */
    const traveler =
      await Traveler.findOne({
        $or: [
          {
            _id: requestedTravelerId
          },
          {
            user: requestedTravelerId
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

    /*
     * Store the authoritative Traveler profile ID,
     * not the User ID.
     */
    job.travelerId =
      traveler._id;

    /*
     * Store only sender-safe information.
     * Do not store email or phone in travelerDetails.
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

    job.pickupCode =
      Math.floor(
        100000 +
        Math.random() * 900000
      ).toString();

    job.pickupQR =
      crypto
        .randomBytes(16)
        .toString("hex");

    job.pickupVerified = false;
    job.status = "accepted";
    job.acceptedAt = new Date();

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

    return res.json({
      success: true,
      data: fullJob
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
        error: "Delivery payment has not been funded"
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

    const codeMatches =
      Boolean(providedCode) &&
      job.pickupCode === providedCode;

    const qrMatches =
      Boolean(providedQr) &&
      job.pickupQR === providedQr;

    if (!codeMatches && !qrMatches) {
      return res.status(400).json({
        success: false,
        error: "Invalid pickup verification"
      });
    }

    job.pickupVerified = true;
    job.status = "in_transit";
    job.pickedUpAt = new Date();

    await job.save();

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
        error: "Pickup was not verified"
      });
    }

    job.status = "delivered";
    job.deliveredAt = new Date();

    await job.save();

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

   Real transfer runs through:
   POST /api/payments/release
============================================================ */

async function completeTravelerJob(
  req,
  res
) {
  try {
    const { jobId } =
      req.params;

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

    const proofPhotoUrl =
      `${backendBaseUrl}/uploads/` +
      `${photoFile.filename}`;

    const signatureUrl =
      `${backendBaseUrl}/uploads/` +
      `${signatureFile.filename}`;

    job.signedBy =
      signedBy;

    job.proofPhoto =
      proofPhotoUrl;

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

    await job.save();

    console.log(
      "✅ Delivery completed:",
      job._id
    );

    console.log(
      "✅ Proof photo:",
      job.proofPhoto
    );

    console.log(
      "✅ Signature:",
      job.signatureUrl
    );

    return res.json({
      success: true,

      message:
        "Delivery completed and ready for payout release.",

      data: job,

      payoutRequired: true,

      payoutEndpoint:
        "/api/payments/release"
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
