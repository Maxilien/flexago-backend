// server-ws.js (CommonJS VERSION)
// ------------------------------------------------------
// Standalone HTTP + WebSocket Test Server
// ------------------------------------------------------

const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// --- HTTP API (mock endpoints) ---
app.post("/pricing/quote", (req, res) => {
  const { distanceKm, durationMin, urgency, size } = req.body;

  let base = 5;
  let perKm = 1.2;

  let urgencyMultiplier =
    urgency === "express" ? 1.4 :
    urgency === "flexible" ? 0.9 : 1;

  let sizeMultiplier =
    size === "large" ? 1.5 :
    size === "medium" ? 1.2 : 1;

  let price = base + distanceKm * perKm;
  price *= urgencyMultiplier * sizeMultiplier;

  res.json({ price });
});

app.post("/matches/search", (req, res) => {
  const matches = [
    {
      id: "M1",
      name: "Alex M.",
      rating: 4.9,
      trips: 128,
      vehicle: "Sedan",
      price: 24.8,
      eta: "35–45 min"
    },
    {
      id: "M2",
      name: "Jordan R.",
      rating: 4.8,
      trips: 96,
      vehicle: "SUV",
      price: 28.4,
      eta: "30–40 min"
    }
  ];

  res.json({ matches });
});

// --- HTTP server + WebSocket server ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Track connected clients by role
const senderClients = new Set();
const travelerClients = new Set();

wss.on("connection", (ws, req) => {
  const url = req.url || "";

  if (url.startsWith("/ws/sender")) {
    senderClients.add(ws);
    console.log("Sender connected");
  } else if (url.startsWith("/ws/traveler")) {
    travelerClients.add(ws);
    console.log("Traveler connected");
  } else {
    console.log("Unknown WS client, closing");
    ws.close();
    return;
  }

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleIncomingMessage(ws, msg);
    } catch (e) {
      console.error("Invalid WS message:", e);
    }
  });

  ws.on("close", () => {
    senderClients.delete(ws);
    travelerClients.delete(ws);
  });
});

// --- Handle messages from clients ---
function handleIncomingMessage(ws, msg) {
  switch (msg.type) {
    case "traveler_position":
      broadcastToSenders({
        type: "traveler_position",
        travelerId: msg.travelerId,
        coords: msg.coords
      });
      break;

    case "delivery_status":
      broadcastToSenders({
        type: "delivery_status",
        status: msg.status
      });
      break;

    case "new_match":
      broadcastToSenders({
        type: "new_match",
        match: msg.match
      });
      break;

    case "delivery_accept":
      broadcastToSenders({
        type: "delivery_status",
        status: "accepted",
        deliveryId: msg.deliveryId
      });
      break;

    default:
      console.log("Unhandled WS message type:", msg.type);
  }
}

// --- Broadcast helpers ---
function broadcastToSenders(payload) {
  const data = JSON.stringify(payload);
  senderClients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  });
}

function broadcastToTravelers(payload) {
  const data = JSON.stringify(payload);
  travelerClients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  });
}

// --- Simple traveler simulation (optional) ---
setInterval(() => {
  const lat = 30.2672 + (Math.random() - 0.5) * 0.02;
  const lng = -97.7431 + (Math.random() - 0.5) * 0.02;

  broadcastToSenders({
    type: "traveler_position",
    travelerId: "T_SIM_1",
    coords: { lat, lng }
  });
}, 4000);

// --- Start server ---
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`HTTP + WS server running on http://localhost:${PORT}`);
  console.log(`WS endpoints: ws://localhost:${PORT}/ws/sender and /ws/traveler`);
});
