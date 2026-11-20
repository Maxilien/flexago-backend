// utils/pricing.js
// ------------------------------------------------------
// The server's price is the one customers pay. The formula
// matches the live estimate in sender.js.
// ------------------------------------------------------

const PLATFORM_PAYOUT_SHARE = 0.8;

// Roads are longer than a straight line, but rarely double it.
const MAX_ROAD_FACTOR = 2;
const DEFAULT_ROAD_FACTOR = 1.3;

const SIZE_FEES = { small: 0, medium: 2, large: 5 };

const PACKAGE_TYPE_FEES = {
  envelope: 0,
  documents: 0,
  small_box: 1,
  medium_box: 2,
  large_box: 4,
  bag: 2,
  fragile: 5,
  electronics: 5,
  other: 2
};

const roundCents = (value) => Math.round(value * 100) / 100;

const positive = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

// The app reports Google's driving distance. Keep it only if it's
// believable for these two addresses, so it can't be lowered to pay less.
function resolveDistanceMiles(reportedMiles, straightLineMiles) {
  const reported = Number(reportedMiles);

  if (!Number.isFinite(reported) || reported <= 0) {
    return straightLineMiles * DEFAULT_ROAD_FACTOR;
  }

  return Math.min(
    Math.max(reported, straightLineMiles),
    straightLineMiles * MAX_ROAD_FACTOR
  );
}

function distanceFee(deliveryType, miles) {
  if (deliveryType === "local") return miles * 0.75;
  if (deliveryType === "nationwide") return 50 + miles * 0.5;
  if (deliveryType === "international") return 200 + miles * 0.25;
  return 0;
}

function weightFee(weight) {
  if (weight > 50) return 10;
  if (weight > 25) return 5;
  if (weight > 10) return 2;
  return 0;
}

function insuranceFee(insuranceType, declaredValue) {
  if (insuranceType === "basic") {
    return Math.min(Math.max(declaredValue * 0.03, 2), 10);
  }

  if (insuranceType === "premium") {
    return Math.min(Math.max(declaredValue * 0.05, 5), 50);
  }

  return 0;
}

function calculatePrice({
  deliveryType,
  distanceMiles,
  weight,
  declaredValue,
  packageType,
  size,
  insuranceType
}) {
  const value = positive(declaredValue);

  const total =
    distanceFee(deliveryType, positive(distanceMiles)) +
    Math.min(value * 0.01, 20) +
    weightFee(positive(weight)) +
    (SIZE_FEES[size] ?? 0) +
    (PACKAGE_TYPE_FEES[packageType] ?? 0) +
    insuranceFee(insuranceType, value);

  const price = roundCents(total);

  return {
    price,
    payoutAmount: roundCents(price * PLATFORM_PAYOUT_SHARE)
  };
}

module.exports = { calculatePrice, resolveDistanceMiles };
