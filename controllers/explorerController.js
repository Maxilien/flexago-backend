// controllers/explorerController.js
// ------------------------------------------------------
// Flexagoo Explorer Controller (CommonJS)
// ------------------------------------------------------

console.log("🟢 explorerController.js LOADED");

const Delivery = require("../models/Delivery");
const Traveler = require("../models/Traveler");

async function getSenderData(req, res) {
  try {
    const deliveries = await Delivery.find().limit(10);
    res.json({ success: true, data: deliveries });
  } catch (err) {
    console.error("Explorer Sender Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}

async function getTravelerData(req, res) {
  try {
    const travelers = await Traveler.find().limit(10);
    res.json({ success: true, data: travelers });
  } catch (err) {
    console.error("Explorer Traveler Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}

module.exports = {
  getSenderData,
  getTravelerData
};
