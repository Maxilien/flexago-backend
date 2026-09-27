// models/User.js
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

    // ⭐ NEW FIELDS FOR ACCOUNT & IDENTITY AUTO‑FILL
    dob: { type: String },          // mm/dd/yyyy or ISO string
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipcode: { type: String },
    country: { type: String },

    // ⭐ Existing KYC block (kept exactly as you had it)
    kyc: {
      ssnLast4: { type: String },
      dob: { type: Date },          // KYC DOB (separate from user.dob)
      idFrontUrl: { type: String },
      idBackUrl: { type: String },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
    },

    resetToken: String,
    resetTokenExpire: Date,

    travelerProfile: {
      vehicleType: { type: String },
      licensePlate: { type: String },
      yearJoined: { type: Number },
      totalTrips: { type: Number, default: 0 },
    },
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
