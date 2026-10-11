// controllers/paymentController.js
// ------------------------------------------------------
// Flexago Stripe Payment Controller
// CommonJS
// ------------------------------------------------------

console.log("🟢 paymentController.js LOADED");

const Stripe = require("stripe");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const User = require("../models/User");
const Delivery = require("../models/Delivery");
const Traveler = require("../models/Traveler");
const Payout = require("../models/Payout");

// ------------------------------------------------------
// HELPERS
// ------------------------------------------------------

function createTransferGroup(deliveryId) {
  return `FLEXAGO_DELIVERY_${deliveryId}`;
}

function normalizeCurrency(currency) {
  return String(currency || "usd").toLowerCase();
}

function convertDollarsToCents(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return null;
  }

  return Math.round(numericAmount * 100);
}

async function getOrCreateStripeCustomer(user) {
  if (user.stripeCustomerId) {
    try {
      const existingCustomer = await stripe.customers.retrieve(
        user.stripeCustomerId
      );

      if (existingCustomer && !existingCustomer.deleted) {
        return existingCustomer;
      }
    } catch (error) {
      console.warn(
        "⚠️ Existing Stripe customer could not be retrieved:",
        error.message
      );
    }

    user.stripeCustomerId = null;
  }

  const customer = await stripe.customers.create(
    {
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: user.phone || undefined,
      metadata: {
        flexagoUserId: user._id.toString(),
        flexagoRole: user.role || "sender",
      },
    },
    {
      idempotencyKey: `flexago-customer-${user._id}`,
    }
  );

  user.stripeCustomerId = customer.id;
  await user.save();

  return customer;
}

// ------------------------------------------------------
// CREATE SETUP INTENT
//
// POST /api/payments/setup-intent
//
// Body:
// {
//   "userId": "MongoDB user ID"
// }
// ------------------------------------------------------

async function createSetupIntent(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.role !== "sender") {
      return res.status(403).json({
        success: false,
        error: "Only sender accounts can create payment methods",
      });
    }

    const customer = await getOrCreateStripeCustomer(user);

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        flexagoUserId: user._id.toString(),
        flexagoRole: user.role,
      },
    });

    return res.status(201).json({
      success: true,
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      customerId: customer.id,
    });
  } catch (error) {
    console.error("❌ Create SetupIntent error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create SetupIntent",
    });
  }
}

// ------------------------------------------------------
// SAVE VERIFIED STRIPE PAYMENT METHOD
//
// PUT /api/payments/payment-method
//
// Body:
// {
//   "userId": "MongoDB user ID",
//   "paymentMethodId": "pm_..."
// }
// ------------------------------------------------------

async function savePaymentMethod(req, res) {
  try {
    const { userId, paymentMethodId } = req.body;

    if (!userId || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: "userId and paymentMethodId are required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.role !== "sender") {
      return res.status(403).json({
        success: false,
        error: "Only sender accounts can save payment methods",
      });
    }

    const customer = await getOrCreateStripeCustomer(user);

    let paymentMethod = await stripe.paymentMethods.retrieve(
      paymentMethodId
    );

    if (paymentMethod.type !== "card" || !paymentMethod.card) {
      return res.status(400).json({
        success: false,
        error: "Only card payment methods are currently supported",
      });
    }

    const attachedCustomerId =
      typeof paymentMethod.customer === "string"
        ? paymentMethod.customer
        : paymentMethod.customer?.id;

    if (!attachedCustomerId) {
      paymentMethod = await stripe.paymentMethods.attach(
        paymentMethodId,
        {
          customer: customer.id,
        }
      );
    } else if (attachedCustomerId !== customer.id) {
      return res.status(400).json({
        success: false,
        error: "Payment method belongs to a different customer",
      });
    }

    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    user.defaultPaymentMethodId = paymentMethod.id;
    user.paymentMethodBrand = paymentMethod.card.brand || null;
    user.paymentMethodLast4 = paymentMethod.card.last4 || null;

    user.payoutMethod = {
      type: "card",
      accountName:
        paymentMethod.billing_details?.name ||
        `${user.firstName} ${user.lastName}`.trim(),
      last4: paymentMethod.card.last4 || null,
      updatedAt: new Date(),
    };

    await user.save();

    return res.json({
      success: true,
      message: "Payment method saved successfully",
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
      },
    });
  } catch (error) {
    console.error("❌ Save payment method error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to save payment method",
    });
  }
}

// ------------------------------------------------------
// CREATE DELIVERY PAYMENT INTENT
//
// POST /api/payments/create-delivery-payment
//
// Body:
// {
//   "deliveryId": "MongoDB delivery ID",
//   "senderId": "MongoDB user ID"
// }
// ------------------------------------------------------

async function createDeliveryPayment(req, res) {
  try {
    const { deliveryId, senderId } = req.body;

    if (!deliveryId || !senderId) {
      return res.status(400).json({
        success: false,
        error: "deliveryId and senderId are required",
      });
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: "Delivery not found",
      });
    }

    if (delivery.senderId.toString() !== senderId.toString()) {
      return res.status(403).json({
        success: false,
        error: "Sender does not own this delivery",
      });
    }

    if (delivery.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        error: "Delivery has already been funded",
      });
    }

    const sender = await User.findById(senderId);

    if (!sender) {
      return res.status(404).json({
        success: false,
        error: "Sender not found",
      });
    }

    if (sender.role !== "sender") {
      return res.status(403).json({
        success: false,
        error: "Only sender accounts can fund deliveries",
      });
    }

    const customer = await getOrCreateStripeCustomer(sender);

    const amountInCents = convertDollarsToCents(delivery.price);

    if (!amountInCents) {
      return res.status(400).json({
        success: false,
        error: "Delivery price must be greater than zero",
      });
    }

    const currency = normalizeCurrency(delivery.currency);

    const transferGroup =
      delivery.transferGroup || createTransferGroup(delivery._id);

    if (delivery.stripePaymentIntentId) {
      const existingPaymentIntent =
        await stripe.paymentIntents.retrieve(
          delivery.stripePaymentIntentId
        );

      if (existingPaymentIntent.status === "succeeded") {
        delivery.paymentStatus = "paid";
        delivery.status = "available";
        delivery.amountCharged =
          existingPaymentIntent.amount_received / 100;
        delivery.fundedAt =
          delivery.fundedAt || new Date();

        if (
          typeof existingPaymentIntent.latest_charge === "string"
        ) {
          delivery.stripeChargeId =
            existingPaymentIntent.latest_charge;
        }

        await delivery.save();
      }

      return res.json({
        success: true,
        reused: true,
        deliveryId: delivery._id,
        paymentIntentId: existingPaymentIntent.id,
        clientSecret: existingPaymentIntent.client_secret,
        paymentStatus: existingPaymentIntent.status,
      });
    }

    const paymentIntentData = {
      amount: amountInCents,
      currency,
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
      transfer_group: transferGroup,
      description: `Flexago delivery payment for ${delivery._id}`,
      metadata: {
        deliveryId: delivery._id.toString(),
        senderId: sender._id.toString(),
        transferGroup,
      },
    };

    if (sender.defaultPaymentMethodId) {
      paymentIntentData.payment_method =
        sender.defaultPaymentMethodId;
    }

    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentData,
      {
        idempotencyKey: `flexago-delivery-payment-${delivery._id}`,
      }
    );

    delivery.status = "payment_pending";
    delivery.paymentStatus = "requires_payment";
    delivery.stripePaymentIntentId = paymentIntent.id;
    delivery.transferGroup = transferGroup;
    delivery.currency = currency;
    delivery.amountCharged = 0;

    await delivery.save();

    return res.status(201).json({
      success: true,
      reused: false,
      deliveryId: delivery._id,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      paymentStatus: paymentIntent.status,
    });
  } catch (error) {
    console.error("❌ Create delivery payment error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create delivery payment",
    });
  }
}

// ------------------------------------------------------
// GET DELIVERY PAYMENT STATUS
//
// GET /api/payments/delivery/:deliveryId/status
// ------------------------------------------------------

async function getDeliveryPaymentStatus(req, res) {
  try {
    const { deliveryId } = req.params;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: "Delivery not found",
      });
    }

    if (!delivery.stripePaymentIntentId) {
      return res.status(400).json({
        success: false,
        error: "Delivery has no Stripe PaymentIntent",
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
      delivery.stripePaymentIntentId
    );

    if (paymentIntent.status === "succeeded") {
      delivery.paymentStatus = "paid";
      delivery.status = "available";
      delivery.amountCharged =
        paymentIntent.amount_received / 100;
      delivery.fundedAt = delivery.fundedAt || new Date();

      if (typeof paymentIntent.latest_charge === "string") {
        delivery.stripeChargeId = paymentIntent.latest_charge;
      }

      await delivery.save();
    } else if (paymentIntent.status === "canceled") {
      delivery.paymentStatus = "failed";
      delivery.status = "payment_failed";
      delivery.paymentFailedAt =
        delivery.paymentFailedAt || new Date();

      await delivery.save();
    }

    return res.json({
      success: true,
      deliveryId: delivery._id,
      paymentIntentId: paymentIntent.id,
      stripeStatus: paymentIntent.status,
      paymentStatus: delivery.paymentStatus,
      deliveryStatus: delivery.status,
      amountCharged: delivery.amountCharged,
      currency: delivery.currency,
    });
  } catch (error) {
    console.error("❌ Get payment status error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve payment status",
    });
  }
}

// ------------------------------------------------------
// RELEASE TRAVELER PAYMENT
//
// POST /api/payments/release
//
// Body:
// {
//   "deliveryId": "MongoDB delivery ID"
// }
// ------------------------------------------------------

async function releaseTravelerPayment(req, res) {
  try {
    const { deliveryId } = req.body;

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        error: "deliveryId is required",
      });
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: "Delivery not found",
      });
    }

    if (delivery.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        error: "Delivery payment has not been funded",
      });
    }

    if (
      delivery.status !== "delivered" &&
      delivery.status !== "payout_pending"
    ) {
      return res.status(400).json({
        success: false,
        error: "Delivery is not ready for payout",
      });
    }

    if (!delivery.travelerId) {
      return res.status(400).json({
        success: false,
        error: "Delivery has no assigned traveler",
      });
    }

    if (delivery.stripeTransferId) {
      return res.json({
        success: true,
        alreadyTransferred: true,
        message: "Traveler payment was already transferred",
        stripeTransferId: delivery.stripeTransferId,
      });
    }

// ------------------------------------------------------
// FIND TRAVELER
//
// Older deliveries store User._id
// Newer deliveries may store Traveler._id
//
// Support both formats.
// ------------------------------------------------------

const traveler = await Traveler.findOne({
  $or: [
    {
      _id: delivery.travelerId
    },
    {
      user: delivery.travelerId
    }
  ]
});

console.log(
  "Traveler lookup:",
  {
    deliveryTravelerId:
      delivery.travelerId?.toString(),
    travelerFound: !!traveler,
    travelerMongoId:
      traveler?._id?.toString(),
    travelerUserId:
      traveler?.user?.toString()
  }
);
    if (!traveler) {
      return res.status(404).json({
        success: false,
        error: "Traveler not found",
      });
    }

    if (!traveler.stripeAccountId) {
      return res.status(400).json({
        success: false,
        error: "Traveler has no Stripe connected account",
      });
    }

    const payoutInCents = convertDollarsToCents(
      delivery.payoutAmount
    );

    if (!payoutInCents) {
      return res.status(400).json({
        success: false,
        error: "Traveler payout amount is invalid",
      });
    }

    delivery.payoutStatus = "processing";
    delivery.status = "payout_pending";
    await delivery.save();

    const transferData = {
      amount: payoutInCents,
      currency: normalizeCurrency(delivery.currency),
      destination: traveler.stripeAccountId,
      transfer_group:
        delivery.transferGroup ||
        createTransferGroup(delivery._id),
      description: `Flexago traveler payment for delivery ${delivery._id}`,
      metadata: {
        deliveryId: delivery._id.toString(),
        travelerId: traveler._id.toString(),
      },
    };

    if (delivery.stripeChargeId) {
      transferData.source_transaction =
        delivery.stripeChargeId;
    }

    const transfer = await stripe.transfers.create(
      transferData,
      {
        idempotencyKey: `flexago-traveler-transfer-${delivery._id}`,
      }
    );

    delivery.stripeTransferId = transfer.id;
    delivery.payoutStatus = "completed";
    delivery.status = "payout_completed";
    delivery.payoutCompletedAt = new Date();

    await delivery.save();

    const existingPayout = await Payout.findOne({
      orderId: delivery._id.toString(),
    });

    let payoutRecord = existingPayout;

    if (!payoutRecord) {
      payoutRecord = await Payout.create({
        orderId: delivery._id.toString(),
        travelerId: traveler._id.toString(),
        amount: payoutInCents / 100,
        status: "paid",
        method: "bank",

        // Existing Payout schema field.
        // This stores the Stripe Transfer ID for now.
        stripePayoutId: transfer.id,

        paidAt: new Date(),
      });
    }

    traveler.totalDeliveries =
      Number(traveler.totalDeliveries || 0) + 1;

    await traveler.save();

    return res.json({
      success: true,
      alreadyTransferred: false,
      message: "Traveler payment transferred successfully",
      deliveryId: delivery._id,
      stripeTransferId: transfer.id,
      payoutRecord,
    });
  } catch (error) {
    console.error("❌ Release traveler payment error:", error);

    if (req.body?.deliveryId) {
      try {
        await Delivery.findByIdAndUpdate(
          req.body.deliveryId,
          {
            $set: {
              payoutStatus: "failed",
              payoutFailedAt: new Date(),
            },
          }
        );
      } catch (updateError) {
        console.error(
          "❌ Unable to mark payout as failed:",
          updateError
        );
      }
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to release traveler payment",
    });
  }
}

// ------------------------------------------------------
// EXPORT CONTROLLER
// ------------------------------------------------------

module.exports = {
  createSetupIntent,
  savePaymentMethod,
  createDeliveryPayment,
  getDeliveryPaymentStatus,
  releaseTravelerPayment,
};