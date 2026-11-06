// utils/cancellationPolicy.js
// ------------------------------------------------------
// Who gets what when a delivery is cancelled. Shares are of
// the price the sender paid; FlexaGo keeps whatever is left.
// ------------------------------------------------------

const FREE_CANCEL_MINUTES = 5;
const NO_SHOW_WAIT_MINUTES = 10;

const OUTCOMES = {
  before_accepted: { refund: 1, traveler: 0 },
  soon_after_accepted: { refund: 1, traveler: 0 },
  after_accepted: { refund: 0.85, traveler: 0.1 },
  traveler_arrived: { refund: 0.5, traveler: 0.4 },
  sender_no_show: { refund: 0.5, traveler: 0.4 },
  item_problem: { refund: 0.5, traveler: 0.4 },
  traveler_cancelled: { refund: 1, traveler: 0 },
  delivery_failed: { refund: 1, traveler: 0 }
};

const roundCents = (value) => Math.round(value * 100) / 100;

function senderCase(delivery, now) {
  if (delivery.status !== "accepted") return "before_accepted";
  if (delivery.arrivedAt) return "traveler_arrived";

  const minutes = (now - new Date(delivery.acceptedAt)) / 60000;

  return minutes <= FREE_CANCEL_MINUTES
    ? "soon_after_accepted"
    : "after_accepted";
}

function outcomeFor(caseName, price) {
  const { refund, traveler } = OUTCOMES[caseName];

  return {
    case: caseName,
    refundAmount: roundCents(price * refund),
    travelerAmount: roundCents(price * traveler)
  };
}

function noShowAllowed(delivery, now) {
  if (!delivery.arrivedAt) return false;

  return (now - new Date(delivery.arrivedAt)) / 60000 >= NO_SHOW_WAIT_MINUTES;
}

module.exports = {
  NO_SHOW_WAIT_MINUTES,
  noShowAllowed,
  outcomeFor,
  senderCase
};
