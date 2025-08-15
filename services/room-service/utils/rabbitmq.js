const amqp = require("amqplib");
const Room = require("../models/Room");

let channel;

// Connect to RabbitMQ
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://admin:password@localhost"
    );
    channel = await connection.createChannel();

    // Declare exchanges
    await channel.assertExchange("room_events", "topic", { durable: true });
    await channel.assertExchange("booking_events", "topic", { durable: true });

    // Declare queue for consuming events
    const queue = await channel.assertQueue("room_service_queue", {
      durable: true,
    });

    // Bind to booking events
    await channel.bindQueue(queue.queue, "booking_events", "room.reserve");
    await channel.bindQueue(queue.queue, "booking_events", "room.release");

    // Consume events
    channel.consume(queue.queue, handleEvent, { noAck: false });

    console.log("Room Service connected to RabbitMQ");
  } catch (error) {
    console.error("RabbitMQ connection error:", error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

// Handle incoming events
async function handleEvent(msg) {
  if (msg) {
    try {
      const event = JSON.parse(msg.content.toString());
      console.log("Room Service received event:", event.eventType);

      switch (event.eventType) {
        case "room.reserve":
          await handleRoomReservation(event.data);
          break;
        case "room.release":
          await handleRoomRelease(event.data);
          break;
      }

      channel.ack(msg);
    } catch (error) {
      console.error("Event handling error:", error);
      channel.nack(msg, false, true);
    }
  }
}

// Handle room reservation
async function handleRoomReservation(data) {
  try {
    const { roomId, bookingId } = data;

    const room = await Room.findById(roomId);
    if (!room || room.status !== "available") {
      await publishEvent("room.reservation_failed", {
        roomId,
        bookingId,
        reason: "Room not available",
      });
      return;
    }

    room.status = "reserved";
    room.updatedAt = new Date();
    await room.save();

    await publishEvent("room.reserved", {
      roomId,
      bookingId,
      hotelId: room.hotelId,
      pricePerNight: room.pricePerNight,
    });
  } catch (error) {
    console.error("Room reservation error:", error);
    await publishEvent("room.reservation_failed", {
      roomId: data.roomId,
      bookingId: data.bookingId,
      reason: "Internal error",
    });
  }
}

// Handle room release
async function handleRoomRelease(data) {
  try {
    const { roomId, bookingId } = data;

    const room = await Room.findById(roomId);
    if (room) {
      room.status = "available";
      room.updatedAt = new Date();
      await room.save();

      await publishEvent("room.released", {
        roomId,
        bookingId,
        hotelId: room.hotelId,
      });
    }
  } catch (error) {
    console.error("Room release error:", error);
  }
}

// Publish event
async function publishEvent(eventType, data) {
  if (channel) {
    const message = JSON.stringify({
      eventType,
      data,
      timestamp: new Date().toISOString(),
      service: "room-service",
    });

    channel.publish("room_events", eventType, Buffer.from(message));
    console.log(`Published event: ${eventType}`);
  }
}

module.exports = {
  connectRabbitMQ,
  publishEvent,
};
