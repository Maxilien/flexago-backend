// backend/server.js  (ES MODULE VERSION)

import http from "http";
import app from "./app.js";
import { initExplorerSocket } from "./ws/explorerSocket.js";

// Load environment variables (ESM version)
import "./config/env.js";

// ⭐ ADD THESE TWO LINES ⭐
import connectDB from "./config/db.js";
connectDB();

const server = http.createServer(app);

// Initialize WebSocket server (GPS + delivery updates)
initExplorerSocket(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Flexagoo API + WebSocket running on http://localhost:${PORT}`);
});

export default server;
