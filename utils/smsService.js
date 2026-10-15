// utils/smsService.js
// ------------------------------------------------------
// FlexaGo SMS Notification Service
//
// Uses the existing Twilio credentials:
//
// TWILIO_ACCOUNT_SID
// TWILIO_AUTH_TOKEN
// TWILIO_PHONE_NUMBER
//
// SMS failures return false and must never interrupt:
// - Delivery acceptance
// - Pickup verification
// - Delivery completion
// - Payment or payout processing
// ------------------------------------------------------

const twilio = require("twilio");

// ------------------------------------------------------
// TWILIO CLIENT
// ------------------------------------------------------

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ------------------------------------------------------
// HELPERS
// ------------------------------------------------------

function normalizePhoneNumber(phone) {
  return String(
    phone || ""
  ).trim();
}

async function sendOperationalSms({
  to,
  body,
  notificationType
}) {
  const phone =
    normalizePhoneNumber(to);

  if (!phone) {
    console.warn(
      `⚠️ ${notificationType} SMS skipped: recipient phone is missing`
    );

    return false;
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.warn(
      `⚠️ ${notificationType} SMS skipped: TWILIO_PHONE_NUMBER is missing`
    );

    return false;
  }

  try {
    const message =
      await client.messages.create({
        body,

        from:
          process.env.TWILIO_PHONE_NUMBER,

        to:
          phone
      });

    console.log(
      `✅ ${notificationType} SMS sent:`,
      {
        to: phone,
        messageSid: message.sid,
        status: message.status
      }
    );

    return true;
  } catch (error) {
    console.error(
      `❌ Failed to send ${notificationType} SMS:`,
      {
        to: phone,
        message:
          error.message,
        code:
          error.code || null
      }
    );

    return false;
  }
}

// ------------------------------------------------------
// DELIVERY ACCEPTED SMS
// ------------------------------------------------------

async function sendDeliveryAcceptedSms({
  to,
  deliveryId,
  travelerName
}) {
  const travelerText =
    travelerName
      ? ` by ${travelerName}`
      : "";

  const deliveryText =
    deliveryId
      ? ` Delivery: ${deliveryId}.`
      : "";

  return sendOperationalSms({
    to,

    notificationType:
      "delivery accepted",

    body:
      `FlexaGo: Your delivery has been accepted${travelerText}.${deliveryText}`
  });
}

// ------------------------------------------------------
// PICKUP VERIFIED SMS
// ------------------------------------------------------

async function sendPickupVerifiedSms({
  to,
  deliveryId
}) {
  const deliveryText =
    deliveryId
      ? ` Delivery: ${deliveryId}.`
      : "";

  return sendOperationalSms({
    to,

    notificationType:
      "pickup verified",

    body:
      `FlexaGo: Your pickup has been verified and the delivery is now in transit.${deliveryText}`
  });
}

// ------------------------------------------------------
// DELIVERY COMPLETED SMS
// ------------------------------------------------------

async function sendDeliveryCompletedSms({
  to,
  deliveryId,
  signedBy
}) {
  const recipientText =
    signedBy
      ? ` Received by ${signedBy}.`
      : "";

  const deliveryText =
    deliveryId
      ? ` Delivery: ${deliveryId}.`
      : "";

  return sendOperationalSms({
    to,

    notificationType:
      "delivery completed",

    body:
      `FlexaGo: Your delivery has been completed successfully.${recipientText}${deliveryText}`
  });
}

// ------------------------------------------------------
// PAYOUT COMPLETED SMS
// ------------------------------------------------------

async function sendPayoutCompletedSms({
  to,
  deliveryId,
  amount
}) {
  const numericAmount =
    Number(amount);

  const amountText =
    Number.isFinite(numericAmount)
      ? ` $${numericAmount.toFixed(2)} is available for withdrawal.`
      : " Your earnings are available for withdrawal.";

  const deliveryText =
    deliveryId
      ? ` Delivery: ${deliveryId}.`
      : "";

  return sendOperationalSms({
    to,

    notificationType:
      "payout completed",

    body:
      `FlexaGo:${amountText}${deliveryText}`
  });
}

// ------------------------------------------------------
// PAYOUT FAILED SMS
// ------------------------------------------------------

async function sendPayoutFailedSms({
  to,
  deliveryId
}) {
  const deliveryText =
    deliveryId
      ? ` Delivery: ${deliveryId}.`
      : "";

  return sendOperationalSms({
    to,

    notificationType:
      "payout failed",

    body:
      `FlexaGo: Your payout requires attention. Your completed delivery remains recorded.${deliveryText}`
  });
}

// ------------------------------------------------------
// EXPORTS
// ------------------------------------------------------

module.exports = {
  sendDeliveryAcceptedSms,
  sendPickupVerifiedSms,
  sendDeliveryCompletedSms,
  sendPayoutCompletedSms,
  sendPayoutFailedSms
};