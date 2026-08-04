// backend/server.js (CommonJS VERSION)
// ------------------------------------------------------
// Flexagoo API + WebSocket Server
// ------------------------------------------------------

console.log("🟢 server.js LOADED");

// ✅ STEP 1 — Load .env FIRST, before ANY other require()
require("./config/env");

const fs = require("fs");

// ============================================================
// ⭐ GOOGLE CLOUD CREDENTIAL LOADER (Render + Local)
// ============================================================
//
// If GOOGLE_APPLICATION_CREDENTIALS_JSON exists (Render),
// write it to service-account.json so Google SDK can load it.
// Locally, your service-account.json already exists.
//
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    fs.writeFileSync(
      "service-account.json",
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    );
    console.log("🔐 Google credentials loaded from Render env variable.");
  } catch (err) {
    console.error("❌ Failed to write service-account.json:", err);
  }
}

const http = require("http");

// ✅ STEP 2 — Now app.js and all routes can safely read process.env
const app = require("./app");
const { Server } = require("socket.io");

// ✅ STEP 3 — Connect to MongoDB after env is loaded
const connectDB = require("./config/db");
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server (Socket.IO)
const io = new Server(server, {
  cors: {
    origin: [
      "https://app.flexagoo.com",
      "https://flexago-frontend.onrender.com",
      "https://flexago-backend.onrender.com",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io",
  transports: ["websocket"],
});

// WebSocket logic (delivery rooms + updates)
io.on("connection", (socket) => {
  console.log("🔌 WS connected:", socket.id);

  socket.on("join_delivery", (deliveryId) => {
    socket.join(deliveryId);
    console.log(`📦 Socket ${socket.id} joined room ${deliveryId}`);
  });

  socket.on("location_update", (data) => {
    io.to(data.deliveryId).emit("location_update", data);
  });

  socket.on("status_update", (data) => {
    io.to(data.deliveryId).emit("status_update", data);
  });

  socket.on("delivery_photo", (data) => {
    io.to(data.deliveryId).emit("delivery_photo", data);
  });

  socket.on("signature_submitted", (data) => {
    io.to(data.deliveryId).emit("signature_submitted", data);
  });

  // ✅ ADDED — handle disconnects for cleaner logs
  socket.on("disconnect", () => {
    console.log("🔴 WS disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Flexagoo API + WebSocket running on port ${PORT}`);
});

module.exports = server;
