// backend/ws/explorerSocket.js
// ------------------------------------------------------
// Flexago WebSocket Engine (CommonJS + Mongoose)
// Real-time traveler GPS, delivery status, and chat
// ------------------------------------------------------

console.log("🟢 explorerSocket.js LOADED");

const {
  WebSocketServer,
  WebSocket
} = require("ws");

const mongoose = require("mongoose");

const Traveler = require("../models/Traveler");
const Delivery = require("../models/Delivery");
const DeliveryMessage = require("../models/DeliveryMessage");

let wss = null;

/*
 * deliveryId -> Set of sockets
 */
const deliveryRooms = {};

/* ============================================================
   HELPERS
============================================================ */

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function normalizeId(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeRole(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function sendSocketMessage(ws, payload) {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(JSON.stringify(payload));
}

function sendSocketError(ws, error) {
  sendSocketMessage(ws, {
    type: "socket_error",
    success: false,
    error
  });
}

/* ============================================================
   ROOM MANAGEMENT
============================================================ */

function joinRoom(ws, deliveryId) {
  const normalizedDeliveryId = normalizeId(deliveryId);

  if (!normalizedDeliveryId) {
    return false;
  }

  /*
   * Remove the socket from a previous room before joining
   * another delivery room.
   */
  if (
    ws.deliveryId &&
    ws.deliveryId !== normalizedDeliveryId &&
    deliveryRooms[ws.deliveryId]
  ) {
    deliveryRooms[ws.deliveryId].delete(ws);

    if (deliveryRooms[ws.deliveryId].size === 0) {
      delete deliveryRooms[ws.deliveryId];
    }
  }

  if (!deliveryRooms[normalizedDeliveryId]) {
    deliveryRooms[normalizedDeliveryId] = new Set();
  }

  deliveryRooms[normalizedDeliveryId].add(ws);
  ws.deliveryId = normalizedDeliveryId;

  console.log(
    `🚪 Client joined delivery room: ${normalizedDeliveryId}`
  );

  return true;
}

function leaveRoom(ws) {
  const deliveryId = ws.deliveryId;

  if (!deliveryId || !deliveryRooms[deliveryId]) {
    return;
  }

  deliveryRooms[deliveryId].delete(ws);

  if (deliveryRooms[deliveryId].size === 0) {
    delete deliveryRooms[deliveryId];
  }

  ws.deliveryId = null;
  ws.deliveryChatUser = null;
}

function broadcastToRoom(deliveryId, payload) {
  const normalizedDeliveryId = normalizeId(deliveryId);
  const room = deliveryRooms[normalizedDeliveryId];

  if (!room) {
    return;
  }

  for (const client of room) {
    sendSocketMessage(client, payload);
  }
}

/* ============================================================
   AUTHORIZE DELIVERY CHAT ROOM
============================================================ */

async function authorizeDeliveryChat(
  deliveryId,
  userId,
  userRole
) {
  const normalizedDeliveryId = normalizeId(deliveryId);
  const normalizedUserId = normalizeId(userId);
  const normalizedRole = normalizeRole(userRole);

  if (
    !isValidObjectId(normalizedDeliveryId) ||
    !isValidObjectId(normalizedUserId)
  ) {
    return {
      authorized: false,
      error: "Invalid delivery or user ID."
    };
  }

  if (
    normalizedRole !== "sender" &&
    normalizedRole !== "traveler"
  ) {
    return {
      authorized: false,
      error: "Invalid delivery chat role."
    };
  }

  const delivery = await Delivery.findById(
    normalizedDeliveryId
  )
    .select("senderId travelerId status")
    .lean();

  if (!delivery) {
    return {
      authorized: false,
      error: "Delivery not found."
    };
  }

  const senderId = normalizeId(delivery.senderId);
  const travelerId = normalizeId(delivery.travelerId);

  const isSender =
    normalizedRole === "sender" &&
    senderId === normalizedUserId;

  const isTraveler =
    normalizedRole === "traveler" &&
    travelerId === normalizedUserId;

  if (!isSender && !isTraveler) {
    return {
      authorized: false,
      error: "You are not authorized to access this delivery chat."
    };
  }

  return {
    authorized: true,
    delivery,
    chatUser: {
      id: normalizedUserId,
      role: normalizedRole
    }
  };
}

/* ============================================================
   HANDLE DELIVERY CHAT JOIN
============================================================ */

async function handleDeliveryChatJoin(ws, data) {
  const deliveryId = normalizeId(data.deliveryId);
  const userId = normalizeId(data.userId);
  const userRole = normalizeRole(data.userRole);

  const authorization = await authorizeDeliveryChat(
    deliveryId,
    userId,
    userRole
  );

  if (!authorization.authorized) {
    sendSocketMessage(ws, {
      type: "delivery_chat_joined",
      success: false,
      deliveryId,
      error: authorization.error
    });

    return;
  }

  joinRoom(ws, deliveryId);

  ws.deliveryChatUser = authorization.chatUser;

  sendSocketMessage(ws, {
    type: "delivery_chat_joined",
    success: true,
    deliveryId,
    userRole: authorization.chatUser.role
  });

  console.log(
    `💬 ${authorization.chatUser.role} joined chat room: ${deliveryId}`
  );
}

/* ============================================================
   HANDLE PERSISTED DELIVERY CHAT MESSAGE
============================================================ */

async function handleDeliveryChatMessage(ws, data) {
  const deliveryId = normalizeId(data.deliveryId);
  const messageId = normalizeId(data.messageId);

  if (
    !ws.deliveryChatUser ||
    ws.deliveryId !== deliveryId
  ) {
    sendSocketError(
      ws,
      "Delivery chat authorization is required."
    );

    return;
  }

  if (
    !isValidObjectId(deliveryId) ||
    !isValidObjectId(messageId)
  ) {
    sendSocketError(
      ws,
      "Invalid delivery chat message."
    );

    return;
  }

  /*
   * Messages are first saved through the REST controller.
   * WebSocket then loads and broadcasts the saved record.
   */
  const savedMessage = await DeliveryMessage.findOne({
    _id: messageId,
    deliveryId,
    senderId: ws.deliveryChatUser.id,
    senderRole: ws.deliveryChatUser.role
  }).lean();

  if (!savedMessage) {
    sendSocketError(
      ws,
      "Saved delivery message was not found."
    );

    return;
  }

  broadcastToRoom(deliveryId, {
    type: "delivery_chat_message",
    success: true,
    deliveryId,
    data: savedMessage
  });

  console.log(
    `💬 Delivery chat message broadcast: ${deliveryId}`
  );
}

/* ============================================================
   HANDLE DELIVERY CHAT READ STATUS
============================================================ */

function handleDeliveryChatRead(ws, data) {
  const deliveryId = normalizeId(data.deliveryId);

  if (
    !ws.deliveryChatUser ||
    ws.deliveryId !== deliveryId
  ) {
    sendSocketError(
      ws,
      "Delivery chat authorization is required."
    );

    return;
  }

  broadcastToRoom(deliveryId, {
    type: "delivery_chat_read",
    success: true,
    deliveryId,
    readBy: {
      id: ws.deliveryChatUser.id,
      role: ws.deliveryChatUser.role
    },
    readAt: new Date().toISOString()
  });
}

/* ============================================================
   INITIALIZE WEBSOCKET SERVER
============================================================ */

function initExplorerSocket(server) {
  wss = new WebSocketServer({
    server,
    path: "/ws"
  });

  console.log(
    "🔌 WebSocket server initialized (MongoDB mode)"
  );

  wss.on("connection", (ws) => {
    console.log("🟢 Client connected to WebSocket");

    ws.deliveryId = null;
    ws.deliveryChatUser = null;

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        /* ====================================================
           JOIN EXISTING DELIVERY ROOM
        ==================================================== */

        if (data.type === "joinDelivery") {
          if (!isValidObjectId(data.deliveryId)) {
            sendSocketError(
              ws,
              "Invalid delivery ID."
            );

            return;
          }

          joinRoom(ws, data.deliveryId);

          sendSocketMessage(ws, {
            type: "delivery_joined",
            success: true,
            deliveryId: normalizeId(data.deliveryId)
          });

          return;
        }

        /* ====================================================
           JOIN AUTHORIZED DELIVERY CHAT ROOM
        ==================================================== */

        if (data.type === "joinDeliveryChat") {
          await handleDeliveryChatJoin(ws, data);
          return;
        }

        /* ====================================================
           DELIVERY CHAT MESSAGE
        ==================================================== */

        if (data.type === "delivery_chat_message") {
          await handleDeliveryChatMessage(ws, data);
          return;
        }

        /* ====================================================
           DELIVERY CHAT READ STATUS
        ==================================================== */

        if (data.type === "delivery_chat_read") {
          handleDeliveryChatRead(ws, data);
          return;
        }

        /* ====================================================
           TRAVELER GPS UPDATE
        ==================================================== */

        if (data.type === "traveler_gps") {
          const { userId, lat, lng } = data;

          const traveler = await Traveler.findOneAndUpdate(
            { user: userId },
            {
              status: "online",
              location: {
                type: "Point",
                coordinates: [lng, lat],
                updatedAt: new Date()
              }
            },
            { new: true }
          );

          if (!traveler) {
            return;
          }

          broadcastToRoom(
            traveler.currentDeliveryId,
            {
              type: "traveler_gps",
              payload: {
                userId,
                lat,
                lng
              }
            }
          );

          console.log(
            `📡 GPS update from ${userId}: ${lat}, ${lng}`
          );

          return;
        }

        /* ====================================================
           TRAVELER STATUS UPDATE
        ==================================================== */

        if (data.type === "status_update") {
          const { deliveryId, status } = data;

          await Delivery.findByIdAndUpdate(
            deliveryId,
            {
              status,
              updatedAt: new Date()
            }
          );

          broadcastToRoom(deliveryId, {
            type: "status_update",
            status
          });

          console.log(
            `⚡ Delivery ${deliveryId} status -> ${status}`
          );

          return;
        }

        /* ====================================================
           TRAVELER ASSIGNED
        ==================================================== */

        if (data.type === "traveler_assigned") {
          const { deliveryId, traveler } = data;

          broadcastToRoom(deliveryId, {
            type: "traveler_assigned",
            traveler
          });

          console.log(
            `👤 Traveler assigned to delivery ${deliveryId}`
          );

          return;
        }

        sendSocketError(
          ws,
          "Unknown WebSocket message type."
        );

      } catch (error) {
        console.error(
          "❌ Error processing WebSocket message:",
          error
        );

        sendSocketError(
          ws,
          "Unable to process WebSocket message."
        );
      }
    });

    ws.on("close", () => {
      leaveRoom(ws);

      console.log(
        "🔴 WebSocket client disconnected"
      );
    });

    ws.on("error", (error) => {
      console.error(
        "❌ WebSocket client error:",
        error
      );
    });
  });

  return wss;
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  joinRoom,
  leaveRoom,
  broadcastToRoom,
  initExplorerSocket
};