// routes/stripeWebhook.js
// ------------------------------------------------------
// Flexago Stripe Webhook Route
// ------------------------------------------------------

console.log("🟢 stripeWebhook.js LOADED");

const express = require("express");
const Stripe = require("stripe");
const Delivery = require("../models/Delivery");

const router = express.Router();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ------------------------------------------------------
// STRIPE WEBHOOK
// ------------------------------------------------------

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event;

    try {
      const signature = req.headers["stripe-signature"];

      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(
        "❌ Stripe webhook signature verification failed:",
        err.message
      );

      return res.status(400).send(
        `Webhook Error: ${err.message}`
      );
    }

    try {
      switch (event.type) {

        // --------------------------------------------------
        // PAYMENT SUCCEEDED
        // --------------------------------------------------
        case "payment_intent.succeeded": {

          const paymentIntent = event.data.object;

          const delivery = await Delivery.findOne({
            stripePaymentIntentId: paymentIntent.id
          });

          if (delivery) {
            delivery.paymentStatus = "paid";
            delivery.status = "available";

            delivery.amountCharged =
              (paymentIntent.amount_received || 0) / 100;

            delivery.currency =
              paymentIntent.currency || "usd";

            delivery.fundedAt = new Date();

            if (paymentIntent.latest_charge) {
              delivery.stripeChargeId =
                paymentIntent.latest_charge;
            }

            await delivery.save();

            console.log(
              `✅ Delivery funded: ${delivery._id}`
            );
          }

          break;
        }

        // --------------------------------------------------
        // PAYMENT FAILED
        // --------------------------------------------------
        case "payment_intent.payment_failed": {

          const paymentIntent = event.data.object;

          const delivery = await Delivery.findOne({
            stripePaymentIntentId: paymentIntent.id
          });

          if (delivery) {
            delivery.paymentStatus = "failed";
            delivery.status = "payment_failed";
            delivery.paymentFailedAt = new Date();

            await delivery.save();

            console.log(
              `❌ Payment failed: ${delivery._id}`
            );
          }

          break;
        }

        // --------------------------------------------------
        // PAYMENT CANCELED
        // --------------------------------------------------
        case "payment_intent.canceled": {

          const paymentIntent = event.data.object;

          const delivery = await Delivery.findOne({
            stripePaymentIntentId: paymentIntent.id
          });

          if (delivery) {
            delivery.paymentStatus = "failed";
            delivery.status = "payment_failed";
            delivery.paymentFailedAt = new Date();

            await delivery.save();

            console.log(
              `⚠️ Payment canceled: ${delivery._id}`
            );
          }

          break;
        }

        // --------------------------------------------------
        // PAYMENT REFUNDED
        // --------------------------------------------------
        case "charge.refunded": {

          const charge = event.data.object;

          const delivery = await Delivery.findOne({
            stripeChargeId: charge.id
          });

          if (delivery) {
            delivery.paymentStatus = "refunded";

            await delivery.save();

            console.log(
              `↩️ Delivery refunded: ${delivery._id}`
            );
          }

          break;
        }

        default:
          console.log(
            `ℹ️ Unhandled event type: ${event.type}`
          );
      }

      return res.json({
        received: true
      });

    } catch (err) {

      console.error(
        "❌ Stripe webhook processing error:",
        err
      );

      return res.status(500).json({
        error: "Webhook processing failed"
      });
    }
  }
);

module.exports = router;