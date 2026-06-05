// backend/routes/uploadRoutes.js
// ------------------------------------------------------
// Flexago Upload Routes (CommonJS)
// ------------------------------------------------------

console.log("🟢 uploadRoutes.js LOADED");

const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random()}${ext}`);
  }
});

const upload = multer({ storage });

// Generic upload handler
router.post("/:type", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileUrl = `https://flexago-backend.onrender.com/uploads/${req.file.filename}`;

  res.json({ url: fileUrl });
});

module.exports = router;
