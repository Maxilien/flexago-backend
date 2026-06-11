// backend/config/env.js

const path = require("path");
const dotenv = require("dotenv");

// Resolve __dirname in CommonJS (no need for fileURLToPath)
const envPath = path.join(__dirname, "../.env");

// Load .env file
dotenv.config({ path: envPath });

module.exports = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI
};
