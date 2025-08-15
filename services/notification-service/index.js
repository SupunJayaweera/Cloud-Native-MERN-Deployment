const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const amqp = require("amqplib");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// MongoDB Connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27022/notificationdb",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: {
    type: String,
    required: true,
    enum: ["email", "sms", "push"],
  },
  channel: {
    type: String,
    required: true,
    enum: [
      "booking_confirmation",
      "booking_cancellation",
      "payment_confirmation",
      "payment_failed",
      "welcome",
    ],
  },
  recipient: { type: String, required: true }, // email or phone number
  subject: { type: String },
  content: { type: String, required: true },
  templateData: { type: mongoose.Schema.Types.Mixed },
  status: {
    type: String,
    enum: ["pending", "sent", "failed", "delivered"],
    default: "pending",
  },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  failureReason: { type: String },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model("Notification", notificationSchema);

// RabbitMQ Connection
let channel;
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost"
    );
    channel = await connection.createChannel();

    // Declare exchanges
    await channel.assertExchange("notification_events", "topic", {
      durable: true,
    });

    // Declare queues for consuming events
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

    console.log("Connected to RabbitMQ");
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
      console.log("Received event:", event.eventType);

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

// Email templates
const emailTemplates = {
  welcome: {
    subject: "Welcome to Hotel Booking System!",
    content:
      "<h2>Welcome {{firstName}}!</h2>" +
      "<p>Thank you for joining our hotel booking platform. We are excited to help you find the perfect accommodation for your travels.</p>" +
      "<p>You can now browse hotels, make reservations, and manage your bookings through our platform.</p>" +
      "<p>Happy travels!</p>" +
      "<p>The Hotel Booking Team</p>",
  },
  booking_confirmation: {
    subject: "Booking Confirmation - {{hotelName}}",
    content:
      "<h2>Booking Confirmed!</h2>" +
      "<p>Dear {{firstName}},</p>" +
      "<p>Your booking has been confirmed. Here are the details:</p>" +
      "<ul>" +
      "<li><strong>Booking ID:</strong> {{bookingId}}</li>" +
      "<li><strong>Hotel:</strong> {{hotelName}}</li>" +
      "<li><strong>Room:</strong> {{roomType}}</li>" +
      "<li><strong>Check-in:</strong> {{checkInDate}}</li>" +
      "<li><strong>Check-out:</strong> {{checkOutDate}}</li>" +
      "<li><strong>Total Amount:</strong> ${{totalAmount}}</li>" +
      "</ul>" +
      "<p>We look forward to hosting you!</p>" +
      "<p>The Hotel Booking Team</p>",
  },
  booking_cancellation: {
    subject: "Booking Cancellation - {{bookingId}}",
    content:
      "<h2>Booking Cancelled</h2>" +
      "<p>Dear {{firstName}},</p>" +
      "<p>Your booking (ID: {{bookingId}}) has been cancelled as requested.</p>" +
      "<p>If you paid for this booking, a refund will be processed within 3-5 business days.</p>" +
      "<p>We hope to serve you again in the future.</p>" +
      "<p>The Hotel Booking Team</p>",
  },
  payment_confirmation: {
    subject: "Payment Confirmation - {{bookingId}}",
    content:
      "<h2>Payment Received</h2>" +
      "<p>Dear {{firstName}},</p>" +
      "<p>We have successfully received your payment for booking {{bookingId}}.</p>" +
      "<p><strong>Amount Paid:</strong> ${{amount}}</p>" +
      "<p><strong>Transaction ID:</strong> {{transactionId}}</p>" +
      "<p>Your booking is now confirmed and you will receive a separate confirmation email.</p>" +
      "<p>The Hotel Booking Team</p>",
  },
  payment_failed: {
    subject: "Payment Failed - {{bookingId}}",
    content:
      "<h2>Payment Failed</h2>" +
      "<p>Dear {{firstName}},</p>" +
      "<p>Unfortunately, we were unable to process your payment for booking {{bookingId}}.</p>" +
      "<p><strong>Reason:</strong> {{reason}}</p>" +
      "<p>Please try again with a different payment method or contact your bank for assistance.</p>" +
      "<p>Your booking will be held for 24 hours to allow you to complete the payment.</p>" +
      "<p>The Hotel Booking Team</p>",
  },
};

// Simulate email sending
async function sendEmail(to, subject, content) {
  // Simulate email sending delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate 95% success rate
  const isSuccess = Math.random() > 0.05;

  if (isSuccess) {
    console.log(`Email sent to ${to}: ${subject}`);
    return { success: true };
  } else {
    console.log(`Email failed to ${to}: ${subject}`);
    return { success: false, error: "SMTP server error" };
  }
}

// Simulate SMS sending
async function sendSMS(to, content) {
  // Simulate SMS sending delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Simulate 90% success rate
  const isSuccess = Math.random() > 0.1;

  if (isSuccess) {
    console.log(`SMS sent to ${to}: ${content.substring(0, 50)}...`);
    return { success: true };
  } else {
    console.log(`SMS failed to ${to}`);
    return { success: false, error: "SMS gateway error" };
  }
}

// Replace template variables
function replaceTemplateVariables(template, data) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, value);
  }
  return result;
}

// Send notification
async function sendNotification(notification) {
  try {
    let result;

    if (notification.type === "email") {
      result = await sendEmail(
        notification.recipient,
        notification.subject,
        notification.content
      );
    } else if (notification.type === "sms") {
      result = await sendSMS(notification.recipient, notification.content);
    }

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

  const template = emailTemplates.welcome;
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

  const template = emailTemplates.booking_confirmation;
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

  const template = emailTemplates.booking_cancellation;
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

  const template = emailTemplates.payment_confirmation;
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

  const template = emailTemplates.payment_failed;
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
  if (channel) {
    const message = JSON.stringify({
      eventType,
      data,
      timestamp: new Date().toISOString(),
      service: "notification-service",
    });

    channel.publish("notification_events", eventType, Buffer.from(message));
    console.log(`Published event: ${eventType}`);
  }
}

// Routes

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "notification-service" });
});

// Get notifications by user
app.get("/api/users/:userId/notifications", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const notifications = await Notification.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Notification.countDocuments(query);

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send custom notification
app.post("/api/notifications", async (req, res) => {
  try {
    const { userId, type, recipient, subject, content, templateData } =
      req.body;

    await sendCustomNotification({
      userId,
      type,
      recipient,
      subject,
      content,
      templateData,
    });

    res.json({ message: "Notification queued for sending" });
  } catch (error) {
    console.error("Custom notification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Retry failed notifications
app.post("/api/notifications/:notificationId/retry", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.notificationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.status !== "failed") {
      return res
        .status(400)
        .json({ error: "Only failed notifications can be retried" });
    }

    if (notification.retryCount >= notification.maxRetries) {
      return res.status(400).json({ error: "Maximum retry attempts exceeded" });
    }

    await sendNotification(notification);

    res.json({ message: "Notification retry initiated" });
  } catch (error) {
    console.error("Notification retry error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Notification Service running on port ${PORT}`);
  await connectRabbitMQ();
});

module.exports = app;
