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
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error("Not allowed by CORS"));
};

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "replace_with_a_long_random_string") {
  throw new Error("JWT_SECRET must be set and non-default for local or production use.");
}

if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === "") {
  throw new Error("MONGO_URI must be set before the server starts.");
}

app.set("trust proxy", 1);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
});

app.set("io", io);

// Socket.IO authentication
io.use(socketAuthMiddleware);

// Socket.IO household setup
setupHouseholdSocket(io);

app.use(cors({
  origin: corsOrigin,
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

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

connectDB();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`StockMates server running on port ${PORT}`);
});
