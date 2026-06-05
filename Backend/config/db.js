// config/db.js
// ---------------------------------------------
// MongoDB Atlas Connection (AWS us-east-1)
// Clean, modular, production-ready
// ---------------------------------------------

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "flexagoo",
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);

    // Retry logic (prevents server crash)
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
