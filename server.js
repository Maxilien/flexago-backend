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
const {
  initExplorerSocket
} = require("./ws/explorerSocket");

// ============================================================
// ⭐ GOOGLE TRANSLATION CLIENT (for /translate + /detect-language)
// ============================================================
const { TranslationServiceClient } = require("@google-cloud/translate").v3;

const translationClient = new TranslationServiceClient({
  keyFilename: "service-account.json",
});

const projectId = process.env.GOOGLE_PROJECT_ID || "logistics-marketplace-491214";
const location = "global";

// ============================================================
// ⭐ LANGUAGE DETECTION ENDPOINT
// ============================================================
//
// This detects the language of ANY text sent by the client.
//
app.post("/detect-language", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required." });
    }

    const request = {
      parent: `projects/${projectId}/locations/${location}`,
      content: text,
      mimeType: "text/plain",
    };

    const [response] = await translationClient.detectLanguage(request);
    const detected = response.languages[0];

    res.json({
      languageCode: detected.languageCode,
      confidence: detected.confidence,
    });
  } catch (err) {
    console.error("❌ Language detection failed:", err);
    res.status(500).json({ error: "Language detection failed." });
  }
});

// ============================================================
// ⭐ TRANSLATION ENDPOINT (Dynamic Translation)
// ============================================================
app.post("/translate", async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({
        error: "text and targetLanguage are required",
      });
    }

    const request = {
      parent: `projects/${projectId}/locations/${location}`,
      contents: [text],
      mimeType: "text/plain",
      targetLanguageCode: targetLanguage,
    };

    if (sourceLanguage) {
      request.sourceLanguageCode = sourceLanguage;
    }

    const [response] = await translationClient.translateText(request);

    res.json({
      translatedText: response.translations[0].translatedText,
    });
  } catch (err) {
    console.error("❌ Translation failed:", err);
    res.status(500).json({ error: "Translation failed." });
  }
});

// ============================================================
// ⭐ DATABASE CONNECTION
// ============================================================
const connectDB = require("./config/db");
connectDB();

// Create HTTP server
const server = http.createServer(app);

const jwt = require("jsonwebtoken");
const { getDeliveryAccess } = require("./middleware/access");

// Create WebSocket server (Socket.IO)
const io = new Server(server, {
  cors: {
    origin: [
      "https://app.flexagoo.com",
      "https://flexago-frontend.onrender.com",
      "https://flexago-backend.onrender.com",
      "capacitor://localhost",
      "https://localhost",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io",
  transports: ["websocket"],
});
// Native WebSocket server for delivery chat
initExplorerSocket(server);
// WebSocket logic (delivery rooms + updates)
io.use((socket, next) => {
  try {
    const decoded = jwt.verify(
      socket.handshake.auth?.token,
      process.env.JWT_SECRET
    );

    if (!decoded.id) return next(new Error("Authentication required"));

    socket.userId = decoded.id;
    return next();
  } catch (error) {
    return next(new Error("Authentication required"));
  }
});

io.on("connection", (socket) => {
  // Only delivery participants can join; events relay only to joined rooms.
  socket.on("join_delivery", async (deliveryId) => {
    try {
      const access = await getDeliveryAccess(deliveryId, socket.userId);
      if (access.role) socket.join(String(deliveryId));
    } catch (error) {
      console.error("join_delivery failed:", error.message);
    }
  });

  ["location_update", "status_update", "delivery_photo", "signature_submitted"]
    .forEach((eventName) => {
      socket.on(eventName, (data) => {
        const room = String(data?.deliveryId || "");

        if (room && socket.rooms.has(room)) {
          io.to(room).emit(eventName, data);
        }
      });
    });
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Flexagoo API + WebSocket running on port ${PORT}`);
});

module.exports = server;

