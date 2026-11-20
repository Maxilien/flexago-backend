// utils/serviceArea.js
// ------------------------------------------------------
// Where FlexaGo runs deliveries. Launch is Texas only:
// both the pickup and the drop-off must be in Texas.
//
// SERVICE_AREA=TX (default) keeps the limit on.
// SERVICE_AREA=ALL turns it off when FlexaGo expands.
//
// Two checks, so neither has to be perfect:
//  1. The app sends the state Google returned for the
//     address; anything other than TX is refused.
//  2. The point must be inside a simplified Texas outline,
//     with a small margin so towns right on the border
//     (El Paso, Texarkana, the Rio Grande Valley) are never
//     refused because the outline is approximate.
// ------------------------------------------------------

const BORDER_MARGIN_MILES = 10;

// Simplified Texas boundary as [lng, lat], clockwise from the
// north-west corner of the panhandle.
const TEXAS = [
  [-103.04, 36.5], [-100.0, 36.5], [-100.0, 34.56],
  [-99.4, 34.38], [-98.6, 34.15], [-97.9, 33.9], [-97.2, 33.75],
  [-96.6, 33.85], [-95.8, 33.86], [-95.2, 33.95], [-94.48, 33.64],
  [-94.04, 33.55], [-94.04, 33.02], [-94.04, 31.99],
  [-93.8, 31.6], [-93.53, 31.18], [-93.6, 30.6], [-93.72, 30.06],
  [-93.85, 29.7], [-94.7, 29.35], [-95.2, 29.0], [-96.2, 28.5],
  [-96.8, 28.2], [-97.2, 27.7], [-97.4, 27.0], [-97.15, 25.95],
  [-97.5, 25.88], [-98.2, 26.07], [-98.7, 26.3], [-99.1, 26.45],
  [-99.5, 27.2], [-99.5, 27.5], [-100.0, 28.1], [-100.3, 28.4],
  [-100.6, 28.9], [-101.0, 29.4], [-101.4, 29.77], [-102.0, 29.8],
  [-102.4, 29.77], [-102.7, 29.6], [-103.0, 29.0], [-103.15, 28.97],
  [-103.5, 29.15], [-104.0, 29.35], [-104.5, 29.65], [-104.7, 30.0],
  [-105.0, 30.6], [-105.6, 31.1], [-106.2, 31.5], [-106.5, 31.78],
  [-106.62, 32.0], [-103.06, 32.0]
];

const AREAS = {
  TX: { name: "Texas", outline: TEXAS }
};

function configuredStates() {
  const raw = String(process.env.SERVICE_AREA || "TX").trim().toUpperCase();

  if (raw === "ALL") return [];

  const states = raw.split(",").map((s) => s.trim()).filter((s) => AREAS[s]);

  return states.length ? states : ["TX"];
}

function insidePolygon([lng, lat], polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const crosses = (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (crosses) inside = !inside;
  }

  return inside;
}

// Distance in miles from a point to the nearest edge of the outline.
function milesToEdge([lng, lat], polygon) {
  const milesPerLat = 69;
  const milesPerLng = 69 * Math.cos((lat * Math.PI) / 180);
  let best = Infinity;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const ax = (polygon[j][0] - lng) * milesPerLng;
    const ay = (polygon[j][1] - lat) * milesPerLat;
    const bx = (polygon[i][0] - lng) * milesPerLng;
    const by = (polygon[i][1] - lat) * milesPerLat;
    const dx = bx - ax;
    const dy = by - ay;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }

  return best;
}

function inArea(coordinates, code) {
  const outline = AREAS[code].outline;

  return insidePolygon(coordinates, outline) ||
    milesToEdge(coordinates, outline) <= BORDER_MARGIN_MILES;
}

// place: { location: { coordinates: [lng, lat] }, state?, country? }
function placeAllowed(place) {
  const states = configuredStates();

  if (!states.length) return true;

  const coordinates = place?.location?.coordinates;

  if (!Array.isArray(coordinates)) return false;

  const country = String(place.country || "").toUpperCase();
  const state = String(place.state || "").toUpperCase();

  if (country && country !== "US") return false;
  if (state && !states.includes(state)) return false;

  return states.some((code) => inArea(coordinates, code));
}

function describe() {
  const states = configuredStates();

  return {
    limited: states.length > 0,
    states,
    name: states.map((code) => AREAS[code].name).join(", "),
    deliveryTypes: states.length ? ["local"] : ["local", "nationwide", "international"]
  };
}

function outsideMessage() {
  const { name } = describe();

  return `FlexaGo is in ${name} only for now. Both the pickup and the drop-off need to be in ${name}.`;
}

module.exports = {
  describe,
  outsideMessage,
  placeAllowed
};
