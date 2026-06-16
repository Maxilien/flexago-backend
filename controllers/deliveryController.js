// controllers/deliveryController.js
const Delivery = require("../models/Delivery");

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

  const la1 = toRad(lat1);
  const la2 = toRad(lat2);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_MILES * c;
}

function distancePointToSegmentMiles(p, a, b) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;

  const AB = [bx - ax, by - ay];
  const AP = [px - ax, py - ay];

  const ab2 = AB[0] * AB[0] + AB[1] * AB[1];
  if (ab2 === 0) return haversineMiles(p, a);

  const ap_ab = AP[0] * AB[0] + AP[1] * AB[1];
  let t = ap_ab / ab2;
  t = Math.max(0, Math.min(1, t));

  const closest = [ax + AB[0] * t, ay + AB[1] * t];

  return haversineMiles(p, closest);
}

function distancePointToPolylineMiles(point, polyline) {
  if (!polyline || polyline.length < 2) return Infinity;

  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distancePointToSegmentMiles(point, polyline[i], polyline[i + 1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/* ============================================================
   NORMALIZE GEO POINT
   ============================================================ */
function normalizeGeoPoint(raw) {
  if (!raw) return null;

  if (raw.location && Array.isArray(raw.location.coordinates)) {
    return {
      address: raw.address,
      location: {
        type: "Point",
        coordinates: [
          Number(raw.location.coordinates[0]),
          Number(raw.location.coordinates[1])
        ]
      }
    };
  }

  if (Array.isArray(raw.coordinates)) {
    return {
      address: raw.address,
      location: {
        type: "Point",
        coordinates: [
          Number(raw.coordinates[0]),
          Number(raw.coordinates[1])
        ]
      }
    };
  }

  return null;
}

/* ============================================================
   CREATE DELIVERY (Marketplace)
   ============================================================ */
async function createDelivery(req, res) {
  console.log("🔥 USING NEW CREATE DELIVERY CONTROLLER");

  try {
    const {
      pickup: rawPickup,
      dropoff: rawDropoff,
      package: pkg,
      sender,
      receiver,
      notes,
      price
    } = req.body;

    const pickup = normalizeGeoPoint(rawPickup);
    const dropoff = normalizeGeoPoint(rawDropoff);

    if (!pickup || !dropoff) {
      return res.status(400).json({
        success: false,
        error: "Invalid pickup or dropoff coordinates."
      });
    }

    const numericPrice = Number(price) || 25;
    const payoutAmount = numericPrice * 0.8;

    const delivery = await Delivery.create({
      sender,
      receiver,
      pickup,
      dropoff,

      // FIXED PACKAGE MAPPING
      package: {
        type: pkg?.type || "",
        weight: pkg?.weight || null,
        size: pkg?.size || "",
        insurance: pkg?.insurance || false,
        deliveryType: pkg?.deliveryType || "",
        description: pkg?.description || "",
        declaredValue: pkg?.declaredValue || null,
        photoUrl: pkg?.photoUrl || ""
      },

      notes,
      price: numericPrice,
      payoutAmount,
      status: "available"
    });

    res.status(201).json({ success: true, data: delivery });
  } catch (err) {
    console.error("Create Delivery Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
/* ============================================================
   SEARCH TRAVELER JOBS
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

    const startPoint = [Number(start.lng), Number(start.lat)];
    const destPoint = [Number(destination.lng), Number(destination.lat)];

    let polyline = [];
    if (Array.isArray(route) && route.length >= 2) {
      polyline = route.map(([lng, lat]) => [Number(lng), Number(lat)]);
    }

    const query = { status: "available" };
    if (deliveryType) query["package.deliveryType"] = deliveryType;

    const deliveries = await Delivery.find(query).lean();

    const matched = deliveries
      .map((job) => {
        if (!job.pickup || !job.dropoff) return null;

        const pickup = job.pickup.location.coordinates;
        const dropoff = job.dropoff.location.coordinates;

        const dPickupStart = haversineMiles(pickup, startPoint);
        const dDropoffDest = haversineMiles(dropoff, destPoint);

        const dPickupRoute = distancePointToPolylineMiles(pickup, polyline);
        const dDropoffRoute = distancePointToPolylineMiles(dropoff, polyline);

        const matches =
          polyline.length < 2
            ? dPickupStart <= maxMiles && dDropoffDest <= maxMiles
            : (dPickupStart <= maxMiles || dPickupRoute <= maxMiles) &&
              (dDropoffDest <= maxMiles || dDropoffRoute <= maxMiles);

        if (!matches) return null;

        return {
          ...job,
          _distance: {
            pickupStartMiles: dPickupStart,
            dropoffDestMiles: dDropoffDest,
            pickupRouteMiles: dPickupRoute,
            dropoffRouteMiles: dDropoffRoute
          }
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const da =
          a._distance.pickupStartMiles +
          a._distance.dropoffDestMiles +
          a._distance.pickupRouteMiles +
          a._distance.dropoffRouteMiles;

        const db =
          b._distance.pickupStartMiles +
          b._distance.dropoffDestMiles +
          b._distance.pickupRouteMiles +
          b._distance.dropoffRouteMiles;

        return da - db;
      });

    res.json({ success: true, count: matched.length, data: matched });
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ success: false, error: "Search failed" });
  }
}

/* ============================================================
   ACCEPT JOB — FIXED VERSION
   ============================================================ */
async function acceptTravelerJob(req, res) {
  try {
    const { jobId } = req.params;
    const { travelerId } = req.body;

    if (!travelerId) {
      return res.status(400).json({
        success: false,
        error: "Missing travelerId"
      });
    }

    const job = await Delivery.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }

    if (job.status !== "available") {
      return res.status(400).json({ success: false, error: "Job already taken" });
    }

    job.status = "accepted";
    job.traveler = travelerId;   // ⭐ FIXED
    job.acceptedAt = new Date();

    await job.save();

    res.json({ success: true, data: job });
  } catch (err) {
    console.error("Accept Job Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}

/* ============================================================
   PICKUP JOB
   ============================================================ */
async function pickupTravelerJob(req, res) {
  try {
    const { jobId } = req.params;

    const job = await Delivery.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: "Job not found" });

    job.status = "in_transit";
    job.pickedUpAt = new Date();

    await job.save();

    res.json({ success: true, data: job });
  } catch (err) {
    console.error("Pickup Job Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}

/* ============================================================
   DELIVER JOB
   ============================================================ */
async function deliverTravelerJob(req, res) {
  try {
    const { jobId } = req.params;

    const job = await Delivery.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: "Job not found" });

    job.status = "delivered";
    job.deliveredAt = new Date();

    await job.save();

    res.json({ success: true, data: job });
  } catch (err) {
    console.error("Deliver Job Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}

/* ============================================================
   COMPLETE JOB (moves to payout_pending)
   ============================================================ */
async function completeTravelerJob(req, res) {
  try {
    const { jobId } = req.params;
    const { proofPhoto } = req.body;

    const job = await Delivery.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: "Job not found" });

    job.status = "payout_pending";
    job.proofPhoto = proofPhoto || null;

    await job.save();

    res.json({ success: true, data: job });
  } catch (err) {
    console.error("Complete Job Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}

/* ============================================================
   PAYOUT JOB (final step)
   ============================================================ */
async function payoutTravelerJob(req, res) {
  try {
    const { jobId } = req.params;

    const job = await Delivery.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: "Job not found" });

    job.status = "payout_completed";
    job.payoutCompletedAt = new Date();

    await job.save();

    res.json({ success: true, data: job });
  } catch (err) {
    console.error("Payout Job Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
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
  payoutTravelerJob
};
