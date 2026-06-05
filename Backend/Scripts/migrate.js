// scripts/migrate.js
// ------------------------------------------------------
// Flexagoo Migration Script (CommonJS)
// Imports mock JSON data into MongoDB using Mongoose
// ------------------------------------------------------

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("../models/User");
const Traveler = require("../models/Traveler");
const Delivery = require("../models/Delivery");
const fs = require("fs");

dotenv.config();

// ---------------------------------------------
// 1. Connect to MongoDB
// ---------------------------------------------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "flexagoo",
    });
    console.log("MongoDB connected for migration...");
  } catch (err) {
    console.error("Migration DB connection error:", err);
    process.exit(1);
  }
};

// ---------------------------------------------
// 2. Load JSON files
// ---------------------------------------------
const loadJSON = (path) => {
  const data = fs.readFileSync(path, "utf-8");
  return JSON.parse(data);
};

// Example paths — adjust to your actual mock data locations
const usersData = loadJSON("./mock/users.json");
const travelersData = loadJSON("./mock/travelers.json");
const deliveriesData = loadJSON("./mock/deliveries.json");

// ---------------------------------------------
// 3. Run Migration
// ---------------------------------------------
const migrate = async () => {
  await connectDB();

  try {
    console.log("Clearing existing collections...");
    await User.deleteMany({});
    await Traveler.deleteMany({});
    await Delivery.deleteMany({});

    console.log("Inserting Users...");
    const createdUsers = await User.insertMany(usersData);

    console.log("Inserting Travelers...");
    const createdTravelers = await Traveler.insertMany(travelersData);

    console.log("Inserting Deliveries...");
    const createdDeliveries = await Delivery.insertMany(deliveriesData);

    console.log("Migration complete!");
    console.log(`Users: ${createdUsers.length}`);
    console.log(`Travelers: ${createdTravelers.length}`);
    console.log(`Deliveries: ${createdDeliveries.length}`);

    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
};

migrate();
