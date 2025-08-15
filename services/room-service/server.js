const app = require("./app");
const { connectRabbitMQ } = require("./utils/rabbitmq");

const PORT = process.env.PORT || 3003;

// Start server
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Room Service running on port ${PORT}`);
  await connectRabbitMQ();
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Room Service shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Room Service shutting down gracefully...");
  process.exit(0);
});
