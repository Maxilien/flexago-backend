// backend/app.js  (ES MODULE VERSION)

import express from "express";
import cors from "cors";

/* ============================================================
   ROUTE IMPORTS
   ============================================================ */

// Legacy Explorer routes (still needed for your frontends)
import explorerRoutes from "./routes/explorerRoutes.js";

// Traveler UI routes (old mock endpoints — MUST LOAD LAST)
import travelersRoutes from "./routes/travelersRoutes.js";

// MongoDB-powered routes
import userRoutes from "./routes/userRoutes.js";
import travelerRoutes from "./routes/travelerRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";

import errorHandler from "./middleware/errorHandler.js";

const app = express();

/* ============================================================
   CORE MIDDLEWARE
   ============================================================ */

app.use(cors());
app.use(express.json());

/* ============================================================
   ROUTES (ORDER MATTERS)
   ============================================================ */

// 1️⃣ Legacy Explorer routes
app.use("/api", explorerRoutes);

// 2️⃣ MongoDB-backed Delivery routes (Traveler job search uses this)
app.use("/api/deliveries", deliveryRoutes);

// 3️⃣ MongoDB-backed Traveler DB routes (full traveler profile + location)
app.use("/api/travelers-db", travelerRoutes);

// 3.5️⃣ Traveler job actions (Accept/Decline)
app.use("/api/traveler", travelerRoutes);

// 4️⃣ MongoDB-backed User routes
app.use("/api/users", userRoutes);

// 5️⃣ Traveler mock routes (OLD) — load LAST so they don't override real routes
app.use("/api/travelers", travelersRoutes);

/* ============================================================
   ERROR HANDLER (GLOBAL)
   ============================================================ */

app.use(errorHandler);

/* ============================================================
   EXPORT (ES MODULE)
   ============================================================ */

export default app;
