const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const bookingRoutes = require("./routes/bookingRoutes");
const { connectRabbitMQ, getChannel } = require("./utils/rabbitmq");
const { handleEvent } = require("./utils/eventHandlers");
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
    service: "booking-service",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use(bookingRoutes);

// MongoDB Connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/bookingdb",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Initialize RabbitMQ and event handling
async function initializeEventHandling() {
  const { channel, queue } = await connectRabbitMQ();

  if (channel && queue) {
    // Consume events
    channel.consume(
      queue.queue,
      async (msg) => {
        if (msg) {
          const success = await handleEvent(msg);
          if (success) {
            channel.ack(msg);
          } else {
            channel.nack(msg, false, true);
          }
        }
      },
      { noAck: false }
    );
  }
}

// Start event handling
initializeEventHandling().catch(console.error);

module.exports = app;
