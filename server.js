console.log("🟢 server.js LOADED");

const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");

// Load environment variables
require("./config/env");

// Connect to MongoDB
const connectDB = require("./config/db");
connectDB();

// ⭐ Add identity routes BEFORE creating server
const identityRoutes = require("./routes/identity");
const identityWebhook = require("./routes/identityWebhook");

// Normal JSON routes
app.use("/api/identity", identityRoutes);

// Webhook MUST use raw body — keep separate
app.use("/api/identity", identityWebhook);

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

// WebSocket logic...
io.on("connection", socket => {
  console.log("WS connected:", socket.id);
  // your socket logic...
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Flexagoo API + WebSocket running on port ${PORT}`);
});

module.exports = server;

