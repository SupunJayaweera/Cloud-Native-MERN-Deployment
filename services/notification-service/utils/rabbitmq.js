const amqp = require("amqplib");
const Notification = require("../models/Notification");
const { getTemplate, replaceTemplateVariables } = require("./templates");
const { sendNotificationByType } = require("./notificationSender");

let channel;
let connection;
let isConnecting = false;
let retryCount = 0;
const maxRetries = 10;

// Connect to RabbitMQ with better error handling
async function connectRabbitMQ() {
  if (isConnecting) return;
  isConnecting = true;

  try {
    console.log(
      `Attempting to connect to RabbitMQ (attempt ${
        retryCount + 1
      }/${maxRetries})...`
    );

    connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://admin:password@localhost"
    );

    // Handle connection errors
    connection.on("error", (err) => {
      console.error("RabbitMQ connection error:", err);
      isConnecting = false;
      setTimeout(() => connectRabbitMQ(), 5000);
    });

    connection.on("close", () => {
      console.log("RabbitMQ connection closed, reconnecting...");
      isConnecting = false;
      setTimeout(() => connectRabbitMQ(), 5000);
    });

    channel = await connection.createChannel();

    // Handle channel errors
    channel.on("error", (err) => {
      console.error("RabbitMQ channel error:", err);
    });

    channel.on("close", () => {
      console.log("RabbitMQ channel closed");
    });

    // Setup exchanges and queues
    await setupExchangesAndQueues();

    console.log("Notification Service connected to RabbitMQ");
    retryCount = 0; // Reset retry count on successful connection
    isConnecting = false;
  } catch (error) {
    console.error("RabbitMQ connection error:", error);
    isConnecting = false;
    retryCount++;

    if (retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
      console.log(`Retrying in ${delay / 1000} seconds...`);
      setTimeout(connectRabbitMQ, delay);
    } else {
      console.error(
        "Max retry attempts reached. Notification service will continue without RabbitMQ."
      );
    }
  }
}

// Setup exchanges and queues with error handling
async function setupExchangesAndQueues() {
  try {
    // Declare notification exchange (this service owns this exchange)
    await channel.assertExchange("notification_events", "topic", {
      durable: true,
    });

    // Try to declare exchanges that other services should create
    // If they don't exist yet, we'll retry later
    const exchanges = ["user_events", "booking_events", "payment_events"];

    for (const exchange of exchanges) {
      try {
        await channel.assertExchange(exchange, "topic", { durable: true });
      } catch (err) {
        console.log(`Exchange ${exchange} not ready yet, will retry...`);
        throw err; // This will trigger a retry
      }
    }

    // Declare queue for consuming events
    const queue = await channel.assertQueue("notification_service_queue", {
      durable: true,
    });

    // Bind to various events that trigger notifications
    await channel.bindQueue(queue.queue, "user_events", "user.created");
    await channel.bindQueue(queue.queue, "booking_events", "booking.confirmed");
    await channel.bindQueue(queue.queue, "booking_events", "booking.cancelled");
    await channel.bindQueue(queue.queue, "payment_events", "payment.completed");
    await channel.bindQueue(queue.queue, "payment_events", "payment.failed");
    await channel.bindQueue(queue.queue, "booking_events", "notification.send");

    // Consume events
    channel.consume(queue.queue, handleEvent, { noAck: false });

    console.log("RabbitMQ exchanges and queues setup complete");
  } catch (error) {
    console.error("Error setting up exchanges and queues:", error);
    throw error; // This will trigger the retry logic
  }
}

// Handle incoming events
async function handleEvent(msg) {
  if (msg) {
    try {
      const event = JSON.parse(msg.content.toString());
      console.log("Notification Service received event:", event.eventType);

      switch (event.eventType) {
        case "user.created":
          await sendWelcomeNotification(event.data);
          break;
        case "booking.confirmed":
          await sendBookingConfirmationNotification(event.data);
          break;
        case "booking.cancelled":
          await sendBookingCancellationNotification(event.data);
          break;
        case "payment.completed":
          await sendPaymentConfirmationNotification(event.data);
          break;
        case "payment.failed":
          await sendPaymentFailedNotification(event.data);
          break;
        case "notification.send":
          await sendCustomNotification(event.data);
          break;
      }

      channel.ack(msg);
    } catch (error) {
      console.error("Event handling error:", error);
      channel.nack(msg, false, true);
    }
  }
}

// Send notification
async function sendNotification(notification) {
  try {
    const result = await sendNotificationByType(
      notification.type,
      notification.recipient,
      notification.subject,
      notification.content
    );

    if (result.success) {
      notification.status = "sent";
      notification.sentAt = new Date();
    } else {
      notification.status = "failed";
      notification.failureReason = result.error;
      notification.retryCount += 1;
    }

    notification.updatedAt = new Date();
    await notification.save();

    await publishEvent("notification.sent", {
      notificationId: notification._id,
      userId: notification.userId,
      type: notification.type,
      status: notification.status,
    });
  } catch (error) {
    console.error("Notification sending error:", error);
    notification.status = "failed";
    notification.failureReason = error.message;
    notification.retryCount += 1;
    notification.updatedAt = new Date();
    await notification.save();
  }
}

// Send welcome notification
async function sendWelcomeNotification(data) {
  const { userId, email, firstName, lastName } = data;

  const template = getTemplate("welcome", "email");
  const content = replaceTemplateVariables(template.content, { firstName });

  const notification = new Notification({
    userId,
    type: "email",
    channel: "welcome",
    recipient: email,
    subject: template.subject,
    content,
    templateData: data,
  });

  await notification.save();
  await sendNotification(notification);
}

// Send booking confirmation notification
async function sendBookingConfirmationNotification(data) {
  const {
    userId,
    userEmail,
    firstName,
    bookingId,
    hotelName,
    roomType,
    checkInDate,
    checkOutDate,
    totalAmount,
  } = data;

  const template = getTemplate("booking_confirmation", "email");
  const templateData = {
    firstName,
    bookingId,
    hotelName,
    roomType,
    checkInDate,
    checkOutDate,
    totalAmount,
  };

  const subject = replaceTemplateVariables(template.subject, templateData);
  const content = replaceTemplateVariables(template.content, templateData);

  const notification = new Notification({
    userId,
    type: "email",
    channel: "booking_confirmation",
    recipient: userEmail,
    subject,
    content,
    templateData,
  });

  await notification.save();
  await sendNotification(notification);
}

// Send booking cancellation notification
async function sendBookingCancellationNotification(data) {
  const { userId, userEmail, firstName, bookingId } = data;

  const template = getTemplate("booking_cancellation", "email");
  const templateData = { firstName, bookingId };

  const subject = replaceTemplateVariables(template.subject, templateData);
  const content = replaceTemplateVariables(template.content, templateData);

  const notification = new Notification({
    userId,
    type: "email",
    channel: "booking_cancellation",
    recipient: userEmail,
    subject,
    content,
    templateData,
  });

  await notification.save();
  await sendNotification(notification);
}

// Send payment confirmation notification
async function sendPaymentConfirmationNotification(data) {
  const { userId, userEmail, firstName, bookingId, amount, transactionId } =
    data;

  const template = getTemplate("payment_confirmation", "email");
  const templateData = { firstName, bookingId, amount, transactionId };

  const subject = replaceTemplateVariables(template.subject, templateData);
  const content = replaceTemplateVariables(template.content, templateData);

  const notification = new Notification({
    userId,
    type: "email",
    channel: "payment_confirmation",
    recipient: userEmail,
    subject,
    content,
    templateData,
  });

  await notification.save();
  await sendNotification(notification);
}

// Send payment failed notification
async function sendPaymentFailedNotification(data) {
  const { userId, userEmail, firstName, bookingId, reason } = data;

  const template = getTemplate("payment_failed", "email");
  const templateData = { firstName, bookingId, reason };

  const subject = replaceTemplateVariables(template.subject, templateData);
  const content = replaceTemplateVariables(template.content, templateData);

  const notification = new Notification({
    userId,
    type: "email",
    channel: "payment_failed",
    recipient: userEmail,
    subject,
    content,
    templateData,
  });

  await notification.save();
  await sendNotification(notification);
}

// Send custom notification
async function sendCustomNotification(data) {
  const { userId, type, recipient, subject, content, templateData } = data;

  const notification = new Notification({
    userId,
    type,
    channel: "custom",
    recipient,
    subject,
    content,
    templateData,
  });

  await notification.save();
  await sendNotification(notification);
}

// Publish event
async function publishEvent(eventType, data) {
  try {
    if (channel) {
      const message = JSON.stringify({
        eventType,
        data,
        timestamp: new Date().toISOString(),
        service: "notification-service",
      });

      channel.publish("notification_events", eventType, Buffer.from(message));
      console.log(`Published event: ${eventType}`);
    } else {
      console.warn(
        `Cannot publish event ${eventType}: RabbitMQ channel not available`
      );
    }
  } catch (error) {
    console.error(`Error publishing event ${eventType}:`, error);
  }
}

module.exports = {
  connectRabbitMQ,
  publishEvent,
  sendNotification,
  sendCustomNotification,
};
