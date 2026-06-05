// backend/routes/explorerRoutes.js
// ------------------------------------------------------
// Flexagoo Explorer Routes (Legacy Mock API)
// ------------------------------------------------------

console.log("🟢 explorerRoutes.js LOADED");

const express = require("express");
const explorerController = require("../controllers/explorerController");

const router = express.Router();

// Explorer expects:
// GET /api/sender
// GET /api/traveler

router.get("/sender", explorerController.getSenderData);
router.get("/traveler", explorerController.getTravelerData);

module.exports = router;

