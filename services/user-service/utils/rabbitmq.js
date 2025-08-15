const amqp = require("amqplib");

let channel;
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost"
    );
    channel = await connection.createChannel();
    await channel.assertExchange("user_events", "topic", { durable: true });
    console.log("Connected to RabbitMQ");
  } catch (error) {
    console.error("RabbitMQ connection error:", error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

async function publishEvent(eventType, data) {
  if (channel) {
    const message = JSON.stringify({
      eventType,
      data,
      timestamp: new Date().toISOString(),
      service: "user-service",
    });
    channel.publish("user_events", eventType, Buffer.from(message));
    console.log(`Published event: ${eventType}`);
  }
}

module.exports = { connectRabbitMQ, publishEvent };
