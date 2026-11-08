// models/WaitlistEntry.js
// People outside the launch area who want to hear when FlexaGo reaches them.
const mongoose = require("mongoose");

const waitlistEntrySchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },
    city: { type: String, trim: true, maxlength: 80, default: "" },
    role: { type: String, enum: ["sender", "traveler", "both"], default: "both" },
    source: { type: String, trim: true, maxlength: 40, default: "website" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("WaitlistEntry", waitlistEntrySchema);
