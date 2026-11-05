// models/SafetyReport.js
const mongoose = require("mongoose");

const REPORT_REASONS = ["harassment", "fraud", "unsafe", "prohibited_item", "other"];

const SafetyReportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: "Delivery", required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 2000, default: "" },
    status: { type: String, enum: ["open", "reviewed"], default: "open" }
  },
  { timestamps: true }
);

SafetyReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("SafetyReport", SafetyReportSchema);
module.exports.REPORT_REASONS = REPORT_REASONS;
