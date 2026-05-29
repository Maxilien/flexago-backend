// backend/routes/explorerRoutes.js
// ------------------------------------------------------
// Flexagoo Explorer Routes (Legacy Mock API)
// ------------------------------------------------------

import express from "express";
import * as explorerController from "../controllers/explorerController.js";

const router = express.Router();

// Explorer expects:
// GET /api/sender
// GET /api/traveler

router.get("/sender", explorerController.getSenderData);
router.get("/traveler", explorerController.getTravelerData);

export default router;

