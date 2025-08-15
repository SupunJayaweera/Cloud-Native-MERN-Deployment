const amqp = require("amqplib");

let channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost"
    );
    channel = await connection.createChannel();

    // Declare exchanges
    await channel.assertExchange("hotel_events", "topic", { durable: true });

    console.log("Connected to RabbitMQ");
    return channel;
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
      service: "hotel-service",
    });

    channel.publish("hotel_events", eventType, Buffer.from(message));
    console.log(`Published event: ${eventType}`);
  }
}

module.exports = { connectRabbitMQ, publishEvent };
