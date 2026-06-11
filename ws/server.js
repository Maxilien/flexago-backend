// backend/ws/testServer.js
// ------------------------------------------------------
// Standalone WebSocket Test Server (CommonJS)
// ------------------------------------------------------

const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Map of deliveryId → Set of connected clients
const deliveryRooms = new Map();

// Handle WebSocket upgrade
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  const match = path.match(/^\/ws\/delivery\/(.+)$/);
  if (!match) {
    socket.destroy();
    return;
  }

  const deliveryId = match[1];

  wss.handleUpgrade(req, socket, head, ws => {
    ws.deliveryId = deliveryId;

    if (!deliveryRooms.has(deliveryId)) {
      deliveryRooms.set(deliveryId, new Set());
    }

    deliveryRooms.get(deliveryId).add(ws);

    ws.on("close", () => {
      deliveryRooms.get(deliveryId).delete(ws);
    });
  });
});

// Broadcast helper
function broadcastToDelivery(deliveryId, data) {
  const room = deliveryRooms.get(deliveryId);
  if (!room) return;

  const message = JSON.stringify(data);

  for (const client of room) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

// Example: simulate traveler movement
app.get("/simulate/:deliveryId", (req, res) => {
  const { deliveryId } = req.params;

  broadcastToDelivery(deliveryId, {
    status: "en_route_pickup",
    lat: 32.78,
    lng: -96.80,
    traveler: {
      name: "John Doe",
      photo: "",
      rating: 4.9
    }
  });

  res.send("Simulated update sent");
});

server.listen(8080, () => {
  console.log("WebSocket test server running on ws://localhost:8080");
});
