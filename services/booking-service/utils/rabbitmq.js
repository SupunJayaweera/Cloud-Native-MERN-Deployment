const amqp = require("amqplib");

let channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost"
    );
    channel = await connection.createChannel();

    // Declare exchanges
    await channel.assertExchange("booking_events", "topic", { durable: true });

    // Declare queues for consuming events
    const queue = await channel.assertQueue("booking_service_queue", {
      durable: true,
    });

    // Bind to events from other services
    await channel.bindQueue(queue.queue, "room_events", "room.reserved");
    await channel.bindQueue(
      queue.queue,
      "room_events",
      "room.reservation_failed"
    );
    await channel.bindQueue(queue.queue, "payment_events", "payment.completed");
    await channel.bindQueue(queue.queue, "payment_events", "payment.failed");

    console.log("Connected to RabbitMQ");
    return { channel, queue };
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
      service: "booking-service",
    });

    channel.publish("booking_events", eventType, Buffer.from(message));
    console.log(`Published event: ${eventType}`);
  }
}

function getChannel() {
  return channel;
}

module.exports = { connectRabbitMQ, publishEvent, getChannel };
