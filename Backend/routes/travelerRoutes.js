// routes/travelerRoutes.js
import express from "express";
import {
  createTraveler,
  getTravelerByUser,
  updateTravelerLocation,
} from "../controllers/travelerController.js";

import { acceptTravelerJob } from "../controllers/deliveryController.js";

const router = express.Router();

router.post("/", createTraveler);
router.get("/user/:userId", getTravelerByUser);
router.put("/location/:userId", updateTravelerLocation);

// ⭐ NEW — Traveler accepts a job
router.post("/jobs/:jobId/accept", acceptTravelerJob);

export default router;
