const mongoose = require("mongoose");

const tempEmailSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  expires: { type: Number, required: true }
});

module.exports = mongoose.model("TempEmail", tempEmailSchema);