const app = require("./app");
const { connectRabbitMQ } = require("./utils/rabbitmq");

const PORT = process.env.PORT || 3005;

// Start server
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Payment Service running on port ${PORT}`);
  await connectRabbitMQ();
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Payment Service shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Payment Service shutting down gracefully...");
  process.exit(0);
});
