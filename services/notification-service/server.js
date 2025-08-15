const app = require("./app");
const { connectRabbitMQ } = require("./utils/rabbitmq");

const PORT = process.env.PORT || 3006;

// Start server
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Notification Service running on port ${PORT}`);
  await connectRabbitMQ();
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Notification Service shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Notification Service shutting down gracefully...");
  process.exit(0);
});
