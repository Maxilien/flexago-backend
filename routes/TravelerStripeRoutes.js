// routes/TravelerStripeRoutes.js
// ------------------------------------------------------
// Flexago Traveler Stripe Connect Routes
// ------------------------------------------------------

console.log("🟢 TravelerStripeRoutes.js LOADED");

const express = require("express");
const Stripe = require("stripe");

const Traveler = require("../models/Traveler");

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

  return configuredUrl.replace(/\/+$/, "");
}

async function getTravelerWithUser(travelerId) {
  return Traveler.findById(
    travelerId
  ).populate(
    "user",
    "firstName lastName email phone"
  );
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
        await getTravelerWithUser(
          travelerId
        );

      if (!traveler) {
        return res.status(404).json({
          success: false,
          error: "Traveler not found"
        });
      }

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

      return res.status(500).json({
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
        await Traveler.findById(
          travelerId
        );

      if (!traveler) {
        return res.status(404).json({
          success: false,
          error: "Traveler not found"
        });
      }

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

      return res.status(500).json({
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
  async (req, res) => {
    try {
      const { travelerId } =
        req.params;

      const traveler =
        await Traveler.findById(
          travelerId
        );

      if (!traveler) {
        return res.status(404).json({
          success: false,
          error: "Traveler not found"
        });
      }

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

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to retrieve connected account status"
      });
    }
  }
);

/* ============================================================
   SAVE CONNECTED ACCOUNT ID

   Temporary compatibility endpoint.
   New onboarding normally saves the account automatically.

   POST /api/traveler-stripe/save-stripe-account
============================================================ */

router.post(
  "/save-stripe-account",
  async (req, res) => {
    try {
      const {
        travelerId,
        accountId
      } = req.body;

      if (
        !travelerId ||
        !accountId
      ) {
        return res.status(400).json({
          success: false,
          error:
            "travelerId and accountId are required"
        });
      }

      const account =
        await stripe.accounts.retrieve(
          accountId
        );

      if (!account) {
        return res.status(404).json({
          success: false,
          error:
            "Stripe connected account not found"
        });
      }

      const traveler =
        await Traveler.findById(
          travelerId
        );

      if (!traveler) {
        return res.status(404).json({
          success: false,
          error: "Traveler not found"
        });
      }

      traveler.stripeAccountId =
        account.id;

      await traveler.save();

      return res.json({
        success: true,
        travelerId:
          traveler._id,
        accountId:
          account.id
      });
    } catch (error) {
      console.error(
        "❌ Save Stripe account error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to save Stripe account ID"
      });
    }
  }
);

/* ============================================================
   EXPORT
============================================================ */

module.exports = router;