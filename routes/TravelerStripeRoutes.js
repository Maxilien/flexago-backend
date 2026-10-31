// routes/TravelerStripeRoutes.js
// ------------------------------------------------------
// Flexago Traveler Stripe Connect Routes
// ------------------------------------------------------

console.log("🟢 TravelerStripeRoutes.js LOADED");

const express = require("express");
const Stripe = require("stripe");

const Traveler = require("../models/Traveler");
const auth = require("../middleware/auth");

const router = express.Router();

const stripe = Stripe(
  process.env.STRIPE_SECRET_KEY
);

/* ============================================================
   HELPERS
============================================================ */

function getFrontendUrl() {
  const configuredUrl =
    process.env.FRONTEND_URL ||
    "https://app.flexagoo.com";

  return configuredUrl.replace(
    /\/+$/,
    ""
  );
}

async function getTravelerWithUser(
  travelerId
) {
  return Traveler.findById(
    travelerId
  ).populate(
    "user",
    "firstName lastName email phone"
  );
}
/* ============================================================
   AUTHORIZE TRAVELER STRIPE ACCESS

   Confirms:
   - Request has an authenticated user
   - Authenticated user is a traveler
   - Requested Traveler profile exists
   - Traveler profile belongs to authenticated User
============================================================ */

async function authorizeTraveler(
  req,
  travelerId
) {
  if (
    !req.user ||
    req.user.role !== "traveler"
  ) {
    const error =
      new Error(
        "Traveler authentication required"
      );

    error.statusCode = 403;

    throw error;
  }

  if (!travelerId) {
    const error =
      new Error(
        "travelerId is required"
      );

    error.statusCode = 400;

    throw error;
  }

  const traveler =
    await getTravelerWithUser(
      travelerId
    );

  if (!traveler) {
    const error =
      new Error(
        "Traveler not found"
      );

    error.statusCode = 404;

    throw error;
  }

  const travelerUserId =
    traveler.user?._id
      ? traveler.user._id.toString()
      : traveler.user?.toString();

  if (
    !travelerUserId ||
    travelerUserId !== req.user.id
  ) {
    const error =
      new Error(
        "You are not authorized to manage this Stripe account"
      );

    error.statusCode = 403;

    throw error;
  }

  return traveler;
}
/* ============================================================
   CREATE OR REUSE CONNECTED ACCOUNT

   POST /api/traveler-stripe/create-account

   Body:
   {
     "travelerId": "MongoDB traveler ID",
     "country": "US"
   }
============================================================ */

router.post(
  "/create-account",
  auth,
  async (req, res) => {
    try {
      const {
        travelerId,
        country = "US"
      } = req.body;

      if (!travelerId) {
        return res.status(400).json({
          success: false,
          error: "travelerId is required"
        });
      }

const traveler =
  await authorizeTraveler(
    req,
    travelerId
  );

      if (traveler.stripeAccountId) {
        try {
          const existingAccount =
            await stripe.accounts.retrieve(
              traveler.stripeAccountId
            );

          return res.json({
            success: true,
            reused: true,
            accountId:
              existingAccount.id,
            detailsSubmitted:
              Boolean(
                existingAccount.details_submitted
              ),
            payoutsEnabled:
              Boolean(
                existingAccount.payouts_enabled
              ),
            chargesEnabled:
              Boolean(
                existingAccount.charges_enabled
              )
          });
        } catch (retrieveError) {
          console.warn(
            "⚠️ Existing Stripe account could not be retrieved:",
            retrieveError.message
          );

          traveler.stripeAccountId =
            null;

          await traveler.save();
        }
      }

      const travelerUser =
        traveler.user || {};
const account =
  await stripe.accounts.create(
    {
      type: "express",

      country:
        String(country).toUpperCase(),

      email:
        travelerUser.email ||
        undefined,

      capabilities: {
        transfers: {
          requested: true
        }
      },

      metadata: {
        flexagoTravelerId:
          traveler._id.toString(),

        flexagoUserId:
          travelerUser._id
            ? travelerUser._id.toString()
            : ""
      }
    },
    {
      idempotencyKey:
        `flexago-connect-account-v1-enabled-${traveler._id}`
    }
  );
      traveler.stripeAccountId =
        account.id;

      await traveler.save();

      console.log(
        "✅ Stripe connected account created:",
        account.id
      );

      return res.status(201).json({
        success: true,
        reused: false,
        travelerId:
          traveler._id,
        accountId:
          account.id,
        detailsSubmitted:
          Boolean(
            account.details_submitted
          ),
        payoutsEnabled:
          Boolean(
            account.payouts_enabled
          ),
        chargesEnabled:
          Boolean(
            account.charges_enabled
          )
      });
    } catch (error) {
      console.error(
        "❌ Create connected account error:",
        error
      );

     return res
  .status(
    error.statusCode || 500
  )
  .json({
        success: false,
        error:
          error.message ||
          "Failed to create connected account"
      });
    }
  }
);

/* ============================================================
   CREATE STRIPE-HOSTED ONBOARDING LINK

   POST /api/traveler-stripe/onboarding-link

   Body:
   {
     "travelerId": "MongoDB traveler ID"
   }
============================================================ */

router.post(
  "/onboarding-link",
  auth,
  async (req, res) => {
    try {
      const { travelerId } =
        req.body;

      if (!travelerId) {
        return res.status(400).json({
          success: false,
          error: "travelerId is required"
        });
      }

const traveler =
  await authorizeTraveler(
    req,
    travelerId
  );
      if (!traveler.stripeAccountId) {
        return res.status(400).json({
          success: false,
          error:
            "Traveler does not have a Stripe connected account"
        });
      }

      const frontendUrl =
        getFrontendUrl();

      const refreshUrl =
        `${frontendUrl}/traveler.html` +
        `?stripe_connect=refresh` +
        `&travelerId=${encodeURIComponent(
          traveler._id.toString()
        )}`;

      const returnUrl =
        `${frontendUrl}/traveler.html` +
        `?stripe_connect=return` +
        `&travelerId=${encodeURIComponent(
          traveler._id.toString()
        )}`;

      const accountLink =
        await stripe.accountLinks.create({
          account:
            traveler.stripeAccountId,

          refresh_url:
            refreshUrl,

          return_url:
            returnUrl,

          type:
            "account_onboarding",

          collection_options: {
            fields:
              "eventually_due"
          }
        });

      console.log(
        "✅ Stripe onboarding link created for:",
        traveler.stripeAccountId
      );

      return res.json({
        success: true,
        travelerId:
          traveler._id,
        accountId:
          traveler.stripeAccountId,
        onboardingUrl:
          accountLink.url,
        expiresAt:
          accountLink.expires_at
      });
    } catch (error) {
      console.error(
        "❌ Create onboarding link error:",
        error
      );

      return res
  .status(
    error.statusCode || 500
  )
  .json({
        success: false,
        error:
          error.message ||
          "Failed to create onboarding link"
      });
    }
  }
);

/* ============================================================
   GET CONNECTED ACCOUNT STATUS

   GET /api/traveler-stripe/status/:travelerId
============================================================ */

router.get(
  "/status/:travelerId",
  auth,
  async (req, res) => {

    try {
      const { travelerId } =
        req.params;

const traveler =
  await authorizeTraveler(
    req,
    travelerId
  );

      if (!traveler.stripeAccountId) {
        return res.json({
          success: true,
          connected: false,
          onboardingComplete: false,
          payoutsEnabled: false,
          chargesEnabled: false,
          accountId: null
        });
      }

      const account =
        await stripe.accounts.retrieve(
          traveler.stripeAccountId
        );

      const currentlyDue =
        account.requirements
          ?.currently_due || [];

      const pastDue =
        account.requirements
          ?.past_due || [];

      const onboardingComplete =
        Boolean(
          account.details_submitted &&
          account.payouts_enabled &&
          currentlyDue.length === 0 &&
          pastDue.length === 0
        );

      return res.json({
        success: true,
        connected: true,
        onboardingComplete,
        accountId:
          account.id,
        detailsSubmitted:
          Boolean(
            account.details_submitted
          ),
        payoutsEnabled:
          Boolean(
            account.payouts_enabled
          ),
        chargesEnabled:
          Boolean(
            account.charges_enabled
          ),
        currentlyDue,
        pastDue,
        disabledReason:
          account.requirements
            ?.disabled_reason ||
          null
      });
    } catch (error) {
      console.error(
        "❌ Stripe account status error:",
        error
      );

      return res
  .status(
    error.statusCode || 500
  )
  .json({
        success: false,
        error:
          error.message ||
          "Failed to retrieve connected account status"
      });
    }
  }
);

/* ============================================================
   LEGACY SAVE CONNECTED ACCOUNT ID

   Disabled for production security.

   Connected Stripe accounts are created and saved through:
   POST /api/traveler-stripe/create-account

   This prevents clients from manually assigning an arbitrary
   Stripe connected account ID to a Traveler profile.
============================================================ */

router.post(
  "/save-stripe-account",
  auth,
  async (req, res) => {
    return res.status(410).json({
      success: false,
      error:
        "This endpoint is no longer supported. Use Stripe Connect onboarding."
    });
  }
);
/* ============================================================
   EXPORT
============================================================ */

module.exports = router;