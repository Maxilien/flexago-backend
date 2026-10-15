// utils/emailService.js
// ------------------------------------------------------
// FlexaGo Email Service
//
// Handles:
// - Email verification
// - Delivery accepted notifications
// - Pickup verified notifications
// - Delivery completed notifications
// - Traveler payout completed notifications
// - Traveler payout failed notifications
//
// Gmail SMTP is currently used for testing.
// Production credentials can be changed later through
// environment variables without changing this file.
// ------------------------------------------------------

const nodemailer = require("nodemailer");

// ------------------------------------------------------
// SMTP TRANSPORTER
// ------------------------------------------------------

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ------------------------------------------------------
// VERIFY SMTP CONNECTION
// ------------------------------------------------------

transporter.verify((error) => {
  if (error) {
    console.error(
      "❌ Email transporter connection failed:",
      error
    );
  } else {
    console.log(
      "✅ Email transporter ready"
    );
  }
});

// ------------------------------------------------------
// HELPERS
// ------------------------------------------------------

function formatMoney(amount) {
  const numericAmount =
    Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "$0.00";
  }

  return `$${numericAmount.toFixed(2)}`;
}

function getFromAddress() {
  return `"FlexaGo" <${process.env.EMAIL_USER}>`;
}

function buildEmailTemplate({
  title,
  message,
  details = [],
  footer,
}) {
  const detailsHtml =
    Array.isArray(details) &&
    details.length > 0
      ? `
        <div
          style="
            background:#f8fafc;
            border:1px solid #e2e8f0;
            border-radius:8px;
            padding:16px;
            margin:20px 0;
          "
        >
          ${details
            .map(
              (detail) => `
                <p
                  style="
                    margin:6px 0;
                    color:#334155;
                    font-size:14px;
                  "
                >
                  <strong>${detail.label}:</strong>
                  ${detail.value}
                </p>
              `
            )
            .join("")}
        </div>
      `
      : "";

  return `
    <div
      style="
        font-family:Arial,sans-serif;
        max-width:560px;
        margin:auto;
        padding:24px;
        color:#0f172a;
      "
    >
      <h2
        style="
          color:#00A3FF;
          margin-bottom:16px;
        "
      >
        ${title}
      </h2>

      <p
        style="
          font-size:15px;
          line-height:1.6;
          color:#334155;
        "
      >
        ${message}
      </p>

      ${detailsHtml}

      ${
        footer
          ? `
            <p
              style="
                margin-top:20px;
                color:#64748b;
                font-size:13px;
                line-height:1.5;
              "
            >
              ${footer}
            </p>
          `
          : ""
      }

      <p
        style="
          margin-top:28px;
          color:#94a3b8;
          font-size:12px;
        "
      >
        FlexaGo Logistics Marketplace
      </p>
    </div>
  `;
}

// ------------------------------------------------------
// INTERNAL OPERATIONAL EMAIL SENDER
//
// Operational notifications intentionally return false
// rather than throwing. An email outage should not undo
// an otherwise successful delivery or payout operation.
// ------------------------------------------------------

async function sendOperationalEmail({
  to,
  subject,
  html,
  notificationType,
}) {
  if (!to) {
    console.warn(
      `⚠️ ${notificationType} email skipped: recipient email missing`
    );

    return false;
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject,
      html,
    });

    console.log(
      `✅ ${notificationType} email sent to:`,
      to
    );

    return true;
  } catch (error) {
    console.error(
      `❌ Failed to send ${notificationType} email:`,
      error
    );

    return false;
  }
}

// ------------------------------------------------------
// EMAIL VERIFICATION
//
// Existing behavior preserved.
// Verification failures throw so the verification
// controller can report the failure to the user.
// ------------------------------------------------------

async function sendVerificationEmail(
  to,
  code
) {
  try {
    await transporter.sendMail({
      from: getFromAddress(),

      to,

      subject:
        "FlexaGo Email Verification",

      html: `
        <div
          style="
            font-family:Arial,sans-serif;
            max-width:480px;
            margin:auto;
          "
        >
          <h2
            style="
              color:#00A3FF;
            "
          >
            FlexaGo Verification
          </h2>

          <p>
            Your verification code is:
          </p>

          <h1
            style="
              letter-spacing:8px;
              color:#0a1628;
            "
          >
            ${code}
          </h1>

          <p>
            This code expires in
            <strong>10 minutes</strong>.
          </p>

          <p
            style="
              color:#999;
              font-size:12px;
            "
          >
            If you did not request this,
            please ignore this email.
          </p>
        </div>
      `,
    });

    console.log(
      "✅ Verification email sent to:",
      to
    );
  } catch (error) {
    console.error(
      "❌ Failed to send verification email:",
      error
    );

    throw error;
  }
}

// ------------------------------------------------------
// DELIVERY ACCEPTED
// ------------------------------------------------------

async function sendDeliveryAcceptedEmail({
  to,
  deliveryId,
  travelerName,
}) {
  const details = [];

  if (deliveryId) {
    details.push({
      label: "Delivery",
      value: String(deliveryId),
    });
  }

  if (travelerName) {
    details.push({
      label: "Traveler",
      value: travelerName,
    });
  }

  return sendOperationalEmail({
    to,

    subject:
      "Your FlexaGo Delivery Has Been Accepted",

    notificationType:
      "delivery accepted",

    html: buildEmailTemplate({
      title:
        "Delivery Accepted",

      message:
        "A traveler has accepted your FlexaGo delivery.",

      details,

      footer:
        "You can continue tracking the delivery from your FlexaGo account.",
    }),
  });
}

// ------------------------------------------------------
// PICKUP VERIFIED
// ------------------------------------------------------

async function sendPickupVerifiedEmail({
  to,
  deliveryId,
}) {
  const details = [];

  if (deliveryId) {
    details.push({
      label: "Delivery",
      value: String(deliveryId),
    });
  }

  return sendOperationalEmail({
    to,

    subject:
      "FlexaGo Pickup Verified",

    notificationType:
      "pickup verified",

    html: buildEmailTemplate({
      title:
        "Pickup Verified",

      message:
        "The pickup for your FlexaGo delivery has been verified.",

      details,

      footer:
        "The delivery is now progressing through the delivery workflow.",
    }),
  });
}

// ------------------------------------------------------
// DELIVERY COMPLETED
// ------------------------------------------------------

async function sendDeliveryCompletedEmail({
  to,
  deliveryId,
  signedBy,
}) {
  const details = [];

  if (deliveryId) {
    details.push({
      label: "Delivery",
      value: String(deliveryId),
    });
  }

  if (signedBy) {
    details.push({
      label: "Received By",
      value: signedBy,
    });
  }

  return sendOperationalEmail({
    to,

    subject:
      "Your FlexaGo Delivery Is Complete",

    notificationType:
      "delivery completed",

    html: buildEmailTemplate({
      title:
        "Delivery Completed",

      message:
        "Your FlexaGo delivery has been completed successfully.",

      details,

      footer:
        "Proof of delivery is available from your FlexaGo account.",
    }),
  });
}

// ------------------------------------------------------
// TRAVELER PAYOUT COMPLETED
// ------------------------------------------------------

async function sendPayoutCompletedEmail({
  to,
  deliveryId,
  amount,
}) {
  const details = [];

  if (deliveryId) {
    details.push({
      label: "Delivery",
      value: String(deliveryId),
    });
  }

  if (
    amount !== null &&
    amount !== undefined
  ) {
    details.push({
      label: "Amount",
      value: formatMoney(amount),
    });
  }

  return sendOperationalEmail({
    to,

    subject:
      "FlexaGo Earnings Available",

    notificationType:
      "payout completed",

    html: buildEmailTemplate({
      title:
        "Earnings Available",

      message:
        "Your earnings for a completed FlexaGo delivery have been processed.",

      details,

      footer:
        "Check your FlexaGo account for your current payout information.",
    }),
  });
}

// ------------------------------------------------------
// TRAVELER PAYOUT FAILED
// ------------------------------------------------------

async function sendPayoutFailedEmail({
  to,
  deliveryId,
}) {
  const details = [];

  if (deliveryId) {
    details.push({
      label: "Delivery",
      value: String(deliveryId),
    });
  }

  return sendOperationalEmail({
    to,

    subject:
      "FlexaGo Payout Needs Attention",

    notificationType:
      "payout failed",

    html: buildEmailTemplate({
      title:
        "Payout Needs Attention",

      message:
        "FlexaGo was unable to complete the payout processing for this delivery.",

      details,

      footer:
        "The completed delivery remains recorded. Please review your payout information or contact FlexaGo support if assistance is needed.",
    }),
  });
}

// ------------------------------------------------------
// EXPORTS
// ------------------------------------------------------

module.exports = {
  sendVerificationEmail,
  sendDeliveryAcceptedEmail,
  sendPickupVerifiedEmail,
  sendDeliveryCompletedEmail,
  sendPayoutCompletedEmail,
  sendPayoutFailedEmail,
};