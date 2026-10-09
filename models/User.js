// ------------------------------------------------------
// Flexagoo User Schema (CommonJS)
// Secure, scalable, compliance‑ready + JWT + Hashing
// ------------------------------------------------------

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["sender", "traveler", "admin"],
      default: "sender",
    },

    phone: {
      type: String,
      required: false,
    },

    // ============================================================
    // ACCOUNT IDENTITY
    // ============================================================

    dob: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipcode: { type: String },
    country: { type: String },

    // ============================================================
    // DISPLAY PAYOUT METHOD (NON-SENSITIVE)
    // ============================================================

    payoutMethod: {
      type: {
        type: String,
        enum: ["bank", "card"],
        default: null,
      },

      accountName: {
        type: String,
        default: null,
      },

      last4: {
        type: String,
        default: null,
      },

      updatedAt: {
        type: Date,
        default: null,
      },
    },

    // ============================================================
    // STRIPE CUSTOMER + PAYMENT METHOD
    // ============================================================

    stripeCustomerId: {
      type: String,
      default: null,
    },

    defaultPaymentMethodId: {
      type: String,
      default: null,
    },

    paymentMethodBrand: {
      type: String,
      default: null,
    },

    paymentMethodLast4: {
      type: String,
      default: null,
    },

    // ============================================================
    // KYC
    // ============================================================

    kycVerified: {
      type: Boolean,
      default: false,
    },

    kyc: {
      ssnLast4: { type: String },
      dob: { type: Date },
      idFrontUrl: { type: String },
      idBackUrl: { type: String },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
    },

    resetToken: String,
    resetTokenExpire: Date,
  },
  { timestamps: true }
);

// ------------------------------------------------------
// Password Hashing Middleware
// ------------------------------------------------------

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// ------------------------------------------------------
// Password Match Method
// ------------------------------------------------------

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
