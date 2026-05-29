// controllers/deliveryController.js
// ------------------------------------------------------
// Flexago Delivery Controller (Create + Search)
// ------------------------------------------------------

import Delivery from "../models/Delivery.js";

console.log("🟢 USING CORRECT CONTROLLER FILE");

/* ============================================================
   GEOJSON VALIDATION HELPER
   ============================================================ */
function isValidGeoPoint(obj) {
  if (!obj) return false;
  if (!obj.location) return false;
  if (obj.location.type !== "Point") return false;
  if (!Array.isArray(obj.location.coordinates)) return false;
  if (obj.location.coordinates.length !== 2) return false;

  const [lng, lat] = obj.location.coordinates;
  return Number.isFinite(lng) && Number.isFinite(lat);
}

/* ============================================================
   NORMALIZE PAYLOAD (ACCEPT OLD + NEW FORMATS)
   ============================================================ */
function normalizeGeoPoint(raw) {
  if (!raw) return null;

  // NEW FORMAT
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

  // OLD FORMAT
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
   CREATE DELIVERY
   ============================================================ */
export const createDelivery = async (req, res) => {
  try {
    console.log("🔥 RAW req.body:", JSON.stringify(req.body, null, 2));

    const {
      pickup: rawPickup,
      dropoff: rawDropoff,
      package: pkg,
      sender,
      receiver,
      notes
    } = req.body;

    const pickup = normalizeGeoPoint(rawPickup);
    const dropoff = normalizeGeoPoint(rawDropoff);

    if (!isValidGeoPoint(pickup)) {
      return res.status(400).json({
        success: false,
        error: "Invalid pickup coordinates."
      });
    }

    if (!isValidGeoPoint(dropoff)) {
      return res.status(400).json({
        success: false,
        error: "Invalid dropoff coordinates."
      });
    }

    const deliveryPayload = {
      sender: {
        name: sender.name,
        phone: sender.phone,
        email: sender.email
      },

      pickup: {
        address: pickup.address,
        location: pickup.location,
        contactName: sender.name,
        contactPhone: sender.phone
      },

      dropoff: {
        address: dropoff.address,
        location: dropoff.location,
        contactName: receiver.name,
        contactPhone: receiver.phone,
        instructions: receiver.instructions
      },

      package: {
        type: pkg.type,
        weight: pkg.weight,
        insurance: pkg.insurance,
        deliveryType: pkg.deliveryType,
        description: pkg.description || null,
        declaredValue: pkg.declaredValue || 0,
        size: pkg.size || null
      },

      notes
    };

    const delivery = await Delivery.create(deliveryPayload);

    res.status(201).json({
      success: true,
      data: delivery
    });

  } catch (err) {
    console.error("Create Delivery Error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};

/* ============================================================
   GEO / DISTANCE HELPERS
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
   TRAVELER SEARCH (CORRECTED)
   ============================================================ */
export const searchTravelerJobs = async (req, res) => {
  try {
    const {
      start,
      destination,
      route,
      maxMiles = 5,
      deliveryType,
      status
    } = req.body;

    if (!start || !destination) {
      return res.status(400).json({
        success: false,
        error: "start and destination are required."
      });
    }

    const startPoint = [Number(start.lng), Number(start.lat)];
    const destPoint = [Number(destination.lng), Number(destination.lat)];

    // Allow empty route (fallback mode)
    let polyline = [];
    if (Array.isArray(route) && route.length >= 2) {
      polyline = route.map(([lng, lat]) => [Number(lng), Number(lat)]);
    }

    // Base MongoDB query
    const query = {};
    if (status) query.status = status;
    if (deliveryType) query["package.deliveryType"] = deliveryType;

    const deliveries = await Delivery.find(query).lean();

    const matched = deliveries
      .map((job) => {
        if (
          !job.pickup ||
          !job.dropoff ||
          !job.pickup.location ||
          !job.dropoff.location
        ) {
          return null;
        }

        const pickup = job.pickup.location.coordinates;
        const dropoff = job.dropoff.location.coordinates;

        const dPickupStart = haversineMiles(pickup, startPoint);
        const dDropoffDest = haversineMiles(dropoff, destPoint);

        const dPickupRoute = distancePointToPolylineMiles(pickup, polyline);
        const dDropoffRoute = distancePointToPolylineMiles(dropoff, polyline);

        const pickupNearStart = dPickupStart <= maxMiles;
        const dropoffNearDest = dDropoffDest <= maxMiles;

        const pickupOnRoute = dPickupRoute <= maxMiles;
        const dropoffOnRoute = dDropoffRoute <= maxMiles;

        // Fallback matching when no route provided
        const matches =
          polyline.length < 2
            ? pickupNearStart && dropoffNearDest
            : (pickupNearStart || pickupOnRoute) &&
              (dropoffNearDest || (pickupOnRoute && dropoffOnRoute));

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

    res.json({
      success: true,
      count: matched.length,
      data: matched
    });
  } catch (err) {
    console.error("Traveler search error:", err);
    res.status(500).json({ success: false, error: "Search failed" });
  }
};
/* ============================================================
   TRAVELER ACCEPTS A JOB
   ============================================================ */
export const acceptTravelerJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    console.log("Traveler accepting job:", jobId);

    const job = await Delivery.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }

    // Update job status
    job.status = "accepted";
    job.acceptedAt = new Date();

    await job.save();

    res.json({ success: true, data: job });
  } catch (err) {
    console.error("Accept Traveler Job Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

