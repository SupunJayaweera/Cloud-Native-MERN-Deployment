const amqp = require("amqplib");
const Payment = require("../models/Payment");
const {
  processPaymentWithGateway,
  processRefundWithGateway,
  maskPaymentDetails,
} = require("./paymentGateway");

let channel;

// Connect to RabbitMQ
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://admin:password@localhost"
    );
    channel = await connection.createChannel();

    // Declare exchanges
    await channel.assertExchange("payment_events", "topic", { durable: true });
    await channel.assertExchange("booking_events", "topic", { durable: true });

    // Declare queue for consuming events
    const queue = await channel.assertQueue("payment_service_queue", {
      durable: true,
    });

    // Bind to booking events
    await channel.bindQueue(queue.queue, "booking_events", "payment.process");
    await channel.bindQueue(queue.queue, "booking_events", "payment.refund");

    // Consume events
    channel.consume(queue.queue, handleEvent, { noAck: false });

    console.log("Payment Service connected to RabbitMQ");
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
      console.log("Payment Service received event:", event.eventType);

      switch (event.eventType) {
        case "payment.process":
          await handlePaymentProcessing(event.data);
          break;
        case "payment.refund":
          await handlePaymentRefund(event.data);
          break;
      }

      channel.ack(msg);
    } catch (error) {
      console.error("Event handling error:", error);
      channel.nack(msg, false, true);
    }
  }
}

// Handle payment processing
async function handlePaymentProcessing(data) {
  try {
    const {
      bookingId,
      userId,
      amount,
      currency,
      paymentMethod,
      paymentDetails,
    } = data;

    // Create payment record
    const payment = new Payment({
      bookingId,
      userId,
      amount,
      currency,
      paymentMethod,
      paymentDetails: maskPaymentDetails(paymentMethod, paymentDetails),
      status: "processing",
      transactionId: `pay_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    });

    await payment.save();

    // Process payment with gateway
    const gatewayResult = await processPaymentWithGateway(data);

    if (gatewayResult.success) {
      payment.status = "completed";
      payment.gatewayTransactionId = gatewayResult.gatewayTransactionId;
      payment.processedAt = new Date();
      payment.updatedAt = new Date();
      await payment.save();

      await publishEvent("payment.completed", {
        paymentId: payment._id,
        bookingId: payment.bookingId,
        userId: payment.userId,
        amount: payment.amount,
        transactionId: payment.transactionId,
      });
    } else {
      payment.status = "failed";
      payment.failureReason = gatewayResult.error;
      payment.updatedAt = new Date();
      await payment.save();

      await publishEvent("payment.failed", {
        paymentId: payment._id,
        bookingId: payment.bookingId,
        userId: payment.userId,
        amount: payment.amount,
        reason: gatewayResult.error,
      });
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    await publishEvent("payment.failed", {
      bookingId: data.bookingId,
      userId: data.userId,
      reason: "Internal processing error",
    });
  }
}

// Handle payment refund
async function handlePaymentRefund(data) {
  try {
    const { paymentId, refundAmount } = data;

    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status !== "completed") {
      await publishEvent("payment.refund_failed", {
        paymentId,
        reason: "Payment not found or not eligible for refund",
      });
      return;
    }

    // Process refund with gateway
    const refundResult = await processRefundWithGateway(payment, refundAmount);

    if (refundResult.success) {
      payment.status = "refunded";
      payment.refundAmount = refundAmount || payment.amount;
      payment.refundedAt = new Date();
      payment.updatedAt = new Date();
      await payment.save();

      await publishEvent("payment.refunded", {
        paymentId: payment._id,
        bookingId: payment.bookingId,
        userId: payment.userId,
        refundAmount: payment.refundAmount,
        refundId: refundResult.refundId,
      });
    } else {
      await publishEvent("payment.refund_failed", {
        paymentId,
        reason: refundResult.error,
      });
    }
  } catch (error) {
    console.error("Payment refund error:", error);
    await publishEvent("payment.refund_failed", {
      paymentId: data.paymentId,
      reason: "Internal refund processing error",
    });
  }
}

// Publish event
async function publishEvent(eventType, data) {
  if (channel) {
    const message = JSON.stringify({
      eventType,
      data,
      timestamp: new Date().toISOString(),
      service: "payment-service",
    });

    channel.publish("payment_events", eventType, Buffer.from(message));
    console.log(`Published event: ${eventType}`);
  }
}

module.exports = {
  connectRabbitMQ,
  publishEvent,
  handlePaymentProcessing,
  handlePaymentRefund,
};
