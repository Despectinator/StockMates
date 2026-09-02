const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  override: true,
});

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const householdRoutes = require("./routes/householdRoutes");
const socketAuthMiddleware = require("./middleware/socketAuthMiddleware");
const { setupHouseholdSocket } = require("./socket/householdSocket");

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

app.set("io", io);

// Socket.IO authentication
io.use(socketAuthMiddleware);

// Socket.IO household setup
setupHouseholdSocket(io);

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/households", householdRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "StockMates API is running",
  });
});

connectDB();

server.listen(PORT, () => {
  console.log(`StockMates server running on http://localhost:${PORT}`);
});
