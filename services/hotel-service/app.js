const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const hotelRoutes = require("./routes/hotelRoutes");
const { connectRabbitMQ } = require("./utils/rabbitmq");
require("dotenv").config();

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
    service: "hotel-service",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use(hotelRoutes);

// MongoDB Connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/hoteldb",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Connect to RabbitMQ
connectRabbitMQ().catch(console.error);

module.exports = app;
