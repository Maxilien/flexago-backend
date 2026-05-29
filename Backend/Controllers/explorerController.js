import Delivery from "../models/Delivery.js";
import Traveler from "../models/Traveler.js";

export const getSenderData = async (req, res) => {
  try {
    const deliveries = await Delivery.find().limit(10);
    res.json({ success: true, data: deliveries });
  } catch (err) {
    console.error("Explorer Sender Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const getTravelerData = async (req, res) => {
  try {
    const travelers = await Traveler.find().limit(10);
    res.json({ success: true, data: travelers });
  } catch (err) {
    console.error("Explorer Traveler Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
