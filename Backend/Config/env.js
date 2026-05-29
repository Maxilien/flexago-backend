// backend/config/env.js

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Needed because __dirname does not exist in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, "../.env") });

export default {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI
};
