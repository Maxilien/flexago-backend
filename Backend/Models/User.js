// models/User.js
// ------------------------------------------------------
// Flexagoo User Schema (Mongoose)
// Secure, scalable, compliance‑ready + JWT + Hashing
// ------------------------------------------------------

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
      select: false, // prevents password from being returned in queries
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

    // KYC / Identity Verification
    kyc: {
      ssnLast4: { type: String },
      dob: { type: Date },
      idFrontUrl: { type: String },
      idBackUrl: { type: String },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
    },

    // Security
    resetToken: String,
    resetTokenExpire: Date,

    // Traveler-specific fields (optional)
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

export default mongoose.model("User", UserSchema);

