// backend/ws/explorerSocket.js
// ------------------------------------------------------
// Flexago WebSocket Engine (CommonJS + Mongoose)
// Real-time traveler GPS + delivery status broadcasting
// ------------------------------------------------------

console.log("🟢 explorerSocket.js LOADED");

const { WebSocketServer } = require("ws");
const Traveler = require("../models/Traveler");
const Delivery = require("../models/Delivery");

let wss = null;

// deliveryId → Set of sockets
const deliveryRooms = {};

/* ============================================================
   ROOM MANAGEMENT
   ============================================================ */
function joinRoom(ws, deliveryId) {
  if (!deliveryRooms[deliveryId]) {
    deliveryRooms[deliveryId] = new Set();
  }

  deliveryRooms[deliveryId].add(ws);
  ws.deliveryId = deliveryId;

  console.log(`🚪 Client joined delivery room: ${deliveryId}`);

  ws.on("close", () => {
    deliveryRooms[deliveryId].delete(ws);
  });
}

function broadcastToRoom(deliveryId, payload) {
  const room = deliveryRooms[deliveryId];
  if (!room) return;

  for (const client of room) {
    if (client.readyState === 1) {
      client.send(JSON.stringify(payload));
    }
  }
}

/* ============================================================
   INITIALIZE WEBSOCKET SERVER
   ============================================================ */
function initExplorerSocket(server) {
  wss = new WebSocketServer({ server });

  console.log("🔌 WebSocket server initialized (MongoDB mode)");

  wss.on("connection", (ws) => {
    console.log("🟢 Client connected to WebSocket");

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        /* ============================================================
           JOIN DELIVERY ROOM
           ============================================================ */
        if (data.type === "joinDelivery") {
          joinRoom(ws, data.deliveryId);
          return;
        }

        /* ============================================================
           TRAVELER GPS UPDATE
           ============================================================ */
        if (data.type === "traveler_gps") {
          const { userId, lat, lng } = data;

          const traveler = await Traveler.findOneAndUpdate(
            { user: userId },
            {
              status: "online",
              location: {
                type: "Point",
                coordinates: [lng, lat],
                updatedAt: new Date(),
              },
            },
            { new: true }
          );

          if (!traveler) return;

          broadcastToRoom(traveler.currentDeliveryId, {
            type: "traveler_gps",
            payload: { userId, lat, lng },
          });

          console.log(`📡 GPS update from ${userId}: ${lat}, ${lng}`);
          return;
        }

        /* ============================================================
           TRAVELER STATUS UPDATE
           ============================================================ */
        if (data.type === "status_update") {
          const { deliveryId, status } = data;

          await Delivery.findByIdAndUpdate(deliveryId, {
            status,
            updatedAt: new Date(),
          });

          broadcastToRoom(deliveryId, {
            type: "status_update",
            status,
          });

          console.log(`⚡ Delivery ${deliveryId} status → ${status}`);
          return;
        }

        /* ============================================================
           TRAVELER ASSIGNED
           ============================================================ */
        if (data.type === "traveler_assigned") {
          const { deliveryId, traveler } = data;

          broadcastToRoom(deliveryId, {
            type: "traveler_assigned",
            traveler,
          });

          console.log(`👤 Traveler assigned to delivery ${deliveryId}`);
          return;
        }

      } catch (err) {
        console.error("❌ Error parsing WebSocket message:", err);
      }
    });

    ws.on("close", () => {
      console.log("🔴 WebSocket client disconnected");
    });
  });
}

module.exports = {
  joinRoom,
  broadcastToRoom,
  initExplorerSocket
};
