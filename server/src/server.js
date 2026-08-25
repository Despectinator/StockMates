require("dotenv").config();

const express = require("express");
const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const householdRoutes = require("./routes/householdRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/households", householdRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "StockMates API is running",
  });
});

connectDB();

app.listen(PORT, () => {
  console.log(`StockMates server running on http://localhost:${PORT}`);
});