// routes/TravelerStripeRoutes.js
// ------------------------------------------------------
// Flexago Traveler Stripe Connect Routes
// ------------------------------------------------------

console.log(
  "TravelerStripeRoutes.js LOADED"
);

const express = require("express");
const Stripe = require("stripe");

const Traveler = require(
  "../models/Traveler"
);

const auth = require(
  "../middleware/auth"
);

const router = express.Router();

const stripe = Stripe(
  process.env.STRIPE_SECRET_KEY
);

const STRIPE_V2_API_VERSION =
  "2026-10-28.endive";

/* ============================================================
   STRIPE API V2 REQUEST HELPER
============================================================ */

async function stripeV2Request(
  path,
  {
    method = "GET",
    body = null,
    idempotencyKey = null
  } = {}
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error =
      new Error(
        "STRIPE_SECRET_KEY is not configured"
      );

    error.statusCode = 500;

    throw error;
  }

  const headers = {
    Authorization:
      `Bearer ${process.env.STRIPE_SECRET_KEY}`,

    "Stripe-Version":
      STRIPE_V2_API_VERSION,

    "Content-Type":
      "application/json"
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] =
      idempotencyKey;
  }

  const response =
    await fetch(
      `https://api.stripe.com${path}`,
      {
        method,
        headers,

        body:
          body === null
            ? undefined
            : JSON.stringify(body)
      }
    );

  const responseText =
    await response.text();

  let data = {};

  if (responseText) {
    try {
      data =
        JSON.parse(
          responseText
        );
    } catch (parseError) {
      const error =
        new Error(
          "Stripe returned an invalid response"
        );

      error.statusCode =
        response.status || 502;

      throw error;
    }
  }

  if (!response.ok) {
    const stripeError =
      data?.error || data || {};

    const error =
      new Error(
        stripeError.message ||
        "Stripe API request failed"
      );

    error.statusCode =
      response.status || 500;

    error.stripeCode =
      stripeError.code || null;

    error.stripeRequestId =
      response.headers.get(
        "request-id"
      ) || null;

    throw error;
  }

  return data;
}

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

function createRouteError(
  message,
  statusCode
) {
  const error =
    new Error(
      message
    );

  error.statusCode =
    statusCode;

  return error;
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
    throw createRouteError(
      "Traveler authentication required",
      403
    );
  }

  if (!travelerId) {
    throw createRouteError(
      "travelerId is required",
      400
    );
  }

  const traveler =
    await getTravelerWithUser(
      travelerId
    );

  if (!traveler) {
    throw createRouteError(
      "Traveler not found",
      404
    );
  }

  const travelerUserId =
    traveler.user?._id
      ? traveler.user._id.toString()
      : traveler.user?.toString();

  if (
    !travelerUserId ||
    travelerUserId !== req.user.id
  ) {
    throw createRouteError(
      "You are not authorized to manage this Stripe account",
      403
    );
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

      const traveler =
        await authorizeTraveler(
          req,
          travelerId
        );

      /*
       * Reuse an existing connected account when
       * Stripe can retrieve the stored account ID.
       *
       * Stripe supports using a v2 account ID with
       * supported Accounts v1 endpoints.
       */
      if (traveler.stripeAccountId) {
        try {
          const existingAccount =
            await stripe.accounts.retrieve(
              traveler.stripeAccountId
            );

          return res.json({
            success: true,
            reused: true,

            travelerId:
              traveler._id,

            accountId:
              existingAccount.id,

            detailsSubmitted:
              Boolean(
                existingAccount
                  .details_submitted
              ),

            payoutsEnabled:
              Boolean(
                existingAccount
                  .payouts_enabled
              ),

            chargesEnabled:
              Boolean(
                existingAccount
                  .charges_enabled
              )
          });
        } catch (retrieveError) {
          console.warn(
            "Existing Stripe account could not be retrieved:",
            {
              travelerId:
                traveler._id.toString(),

              message:
                retrieveError.message
            }
          );

          /*
           * Clear an obsolete sandbox account ID.
           *
           * The v2 idempotency key below prevents
           * duplicate account creation on retries.
           */
          traveler.stripeAccountId =
            null;

          await traveler.save();
        }
      }

      const travelerUser =
        traveler.user || {};

      const firstName =
        String(
          travelerUser.firstName || ""
        ).trim();

      const lastName =
        String(
          travelerUser.lastName || ""
        ).trim();

      const travelerEmail =
        String(
          travelerUser.email || ""
        ).trim();

      if (!travelerEmail) {
        throw createRouteError(
          "Traveler email is required for Stripe onboarding",
          400
        );
      }

      const displayName =
        `${firstName} ${lastName}`.trim() ||
        travelerEmail ||
        `Flexago Traveler ${traveler._id}`;

      const normalizedCountry =
        String(
          country || "US"
        )
          .trim()
          .toLowerCase();

      /*
       * Create an Accounts v2 Recipient account.
       *
       * Recipient is appropriate because the traveler
       * receives transfers from Flexago and does not
       * create charges directly against customers.
       */
      const account =
        await stripeV2Request(
          "/v2/core/accounts",
          {
            method: "POST",

            idempotencyKey:
              `flexago-recipient-v2-${traveler._id}`,

            body: {
              contact_email:
                travelerEmail,

              display_name:
                displayName,

              dashboard:
                "express",

              identity: {
                country:
                  normalizedCountry,

                entity_type:
                  "individual",

                individual: {
                  email:
                    travelerEmail,

                  given_name:
                    firstName ||
                    undefined,

                  surname:
                    lastName ||
                    undefined,

                  phone:
                    travelerUser.phone ||
                    undefined
                }
              },

              defaults: {
                currency:
                  "usd",

                responsibilities: {
                  fees_collector:
                    "application",

                  losses_collector:
                    "application"
                }
              },

              configuration: {
                recipient: {
                  capabilities: {
                    stripe_balance: {
                      stripe_transfers: {
                        requested: true
                      }
                    }
                  }
                }
              },

              metadata: {
                flexagoTravelerId:
                  traveler._id.toString(),

                flexagoUserId:
                  travelerUser._id
                    ? travelerUser._id.toString()
                    : ""
              },

              include: [
                "configuration.recipient",
                "defaults",
                "identity",
                "requirements"
              ]
            }
          }
        );

      if (!account?.id) {
        throw createRouteError(
          "Stripe did not return a connected account ID",
          502
        );
      }

      traveler.stripeAccountId =
        account.id;

      await traveler.save();

      console.log(
        "Stripe Recipient account created:",
        {
          travelerId:
            traveler._id.toString(),

          accountId:
            account.id,

          livemode:
            account.livemode
        }
      );

      return res.status(201).json({
        success: true,
        reused: false,

        travelerId:
          traveler._id,

        accountId:
          account.id,

        onboardingComplete:
          false,

        detailsSubmitted:
          false,

        payoutsEnabled:
          false,

        chargesEnabled:
          false
      });
    } catch (error) {
      console.error(
        "Create Stripe Recipient account error:",
        {
          message:
            error.message,

          stripeCode:
            error.stripeCode || null,

          stripeRequestId:
            error.stripeRequestId || null,

          statusCode:
            error.statusCode || 500
        }
      );

      return res
        .status(
          error.statusCode || 500
        )
        .json({
          success: false,

          error:
            error.message ||
            "Failed to create connected account",

          code:
            error.stripeCode ||
            null
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

      const traveler =
        await authorizeTraveler(
          req,
          travelerId
        );

      if (!traveler.stripeAccountId) {
        throw createRouteError(
          "Traveler does not have a Stripe connected account",
          400
        );
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

      /*
       * Create an Accounts v2 onboarding link.
       *
       * The traveler is redirected to Stripe to enter
       * identity, verification, and payout information.
       */
      const accountLink =
        await stripeV2Request(
          "/v2/core/account_links",
          {
            method: "POST",

            idempotencyKey:
              `flexago-recipient-onboarding-${traveler._id}-${Date.now()}`,

            body: {
              account:
                traveler.stripeAccountId,

              use_case: {
                type:
                  "account_onboarding",

                account_onboarding: {
                  refresh_url:
                    refreshUrl,

                  return_url:
                    returnUrl,

                  collection_options: {
                    fields:
                      "eventually_due",

                    future_requirements:
                      "include"
                  }
                }
              }
            }
          }
        );

      if (!accountLink?.url) {
        throw createRouteError(
          "Stripe did not return an onboarding URL",
          502
        );
      }

      console.log(
        "Stripe Recipient onboarding link created:",
        {
          travelerId:
            traveler._id.toString(),

          accountId:
            traveler.stripeAccountId,

          livemode:
            accountLink.livemode
        }
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
        "Create Recipient onboarding link error:",
        {
          message:
            error.message,

          stripeCode:
            error.stripeCode || null,

          stripeRequestId:
            error.stripeRequestId || null,

          statusCode:
            error.statusCode || 500
        }
      );

      return res
        .status(
          error.statusCode || 500
        )
        .json({
          success: false,

          error:
            error.message ||
            "Failed to create onboarding link",

          code:
            error.stripeCode ||
            null
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
          accountId: null,
          currentlyDue: [],
          pastDue: [],
          disabledReason: null
        });
      }

      /*
       * Retrieve a v1-compatible representation of the
       * v2 Account so the existing Flexago response
       * fields can remain stable during migration.
       */
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

      const detailsSubmitted =
        Boolean(
          account.details_submitted
        );

      const payoutsEnabled =
        Boolean(
          account.payouts_enabled
        );

      const chargesEnabled =
        Boolean(
          account.charges_enabled
        );

      const onboardingComplete =
        Boolean(
          detailsSubmitted &&
          payoutsEnabled &&
          currentlyDue.length === 0 &&
          pastDue.length === 0
        );

      return res.json({
        success: true,
        connected: true,
        onboardingComplete,

        accountId:
          account.id,

        detailsSubmitted,
        payoutsEnabled,
        chargesEnabled,
        currentlyDue,
        pastDue,

        disabledReason:
          account.requirements
            ?.disabled_reason ||
          null
      });
    } catch (error) {
      console.error(
        "Stripe account status error:",
        {
          message:
            error.message,

          type:
            error.type || null,

          code:
            error.code || null,

          statusCode:
            error.statusCode || 500
        }
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

   Connected Stripe accounts must be created and saved through:
   POST /api/traveler-stripe/create-account
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