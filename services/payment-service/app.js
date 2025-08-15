const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "payment-service",
    timestamp: new Date().toISOString(),
  });
});

// MongoDB Connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/paymentdb",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Database connection events
mongoose.connection.on("connected", () => {
  console.log("Payment Service connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("Payment Service disconnected from MongoDB");
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "payment-service" });
});

// Routes
app.use("/api", paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

module.exports = app;
