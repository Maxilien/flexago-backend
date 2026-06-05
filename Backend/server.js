// backend/server.js (CommonJS VERSION)
// ------------------------------------------------------
// Flexagoo API + WebSocket Server
// ------------------------------------------------------

console.log("🟢 server.js LOADED");

const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");

// Load environment variables
require("./config/env");

// Connect to MongoDB
const connectDB = require("./config/db");
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server (Socket.IO)
const io = new Server(server, {
  cors: {
    origin: [
      "https://flexago-frontend.onrender.com",
      "https://flexago-backend.onrender.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  path: "/socket.io",
  transports: ["websocket"]
});

// WebSocket logic (delivery rooms + updates)
io.on("connection", socket => {
  console.log("WS connected:", socket.id);

  // Join delivery room
  socket.on("join_delivery", deliveryId => {
    socket.join(deliveryId);
    console.log(`Socket ${socket.id} joined room ${deliveryId}`);
  });

  // Traveler GPS updates
  socket.on("location_update", data => {
    io.to(data.deliveryId).emit("location_update", data);
  });

  // Delivery status updates
  socket.on("status_update", data => {
    io.to(data.deliveryId).emit("status_update", data);
  });

  // Delivery photo
  socket.on("delivery_photo", data => {
    io.to(data.deliveryId).emit("delivery_photo", data);
  });

  // Signature submitted
  socket.on("signature_submitted", data => {
    io.to(data.deliveryId).emit("signature_submitted", data);
  });
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Flexagoo API + WebSocket running on port ${PORT}`);
});

module.exports = server;
