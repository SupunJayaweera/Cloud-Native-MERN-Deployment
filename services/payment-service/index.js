const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const amqp = require('amqplib');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27021/paymentdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'USD' },
  paymentMethod: { 
    type: String, 
    required: true, 
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer'] 
  },
  paymentDetails: {
    cardNumber: { type: String }, // Last 4 digits only
    cardHolderName: { type: String },
    expiryMonth: { type: Number },
    expiryYear: { type: Number }
  },
  transactionId: { type: String, unique: true },
  gatewayTransactionId: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'], 
    default: 'pending' 
  },
  failureReason: { type: String },
  processedAt: { type: Date },
  refundedAt: { type: Date },
  refundAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

// RabbitMQ Connection
let channel;
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();
    
    // Declare exchanges
    await channel.assertExchange('payment_events', 'topic', { durable: true });
    
    // Declare queues for consuming events
    const queue = await channel.assertQueue('payment_service_queue', { durable: true });
    
    // Bind to booking events
    await channel.bindQueue(queue.queue, 'booking_events', 'payment.process');
    await channel.bindQueue(queue.queue, 'booking_events', 'payment.refund');
    
    // Consume events
    channel.consume(queue.queue, handleEvent, { noAck: false });
    
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

// Handle incoming events
async function handleEvent(msg) {
  if (msg) {
    try {
      const event = JSON.parse(msg.content.toString());
      console.log('Received event:', event.eventType);
      
      switch (event.eventType) {
        case 'payment.process':
          await handlePaymentProcessing(event.data);
          break;
        case 'payment.refund':
          await handlePaymentRefund(event.data);
          break;
      }
      
      channel.ack(msg);
    } catch (error) {
      console.error('Event handling error:', error);
      channel.nack(msg, false, true);
    }
  }
}

// Simulate payment gateway processing
async function processPaymentWithGateway(paymentData) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate 90% success rate
  const isSuccess = Math.random() > 0.1;
  
  if (isSuccess) {
    return {
      success: true,
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      gatewayTransactionId: `gw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } else {
    return {
      success: false,
      error: 'Payment declined by bank'
    };
  }
}

// Handle payment processing
async function handlePaymentProcessing(data) {
  try {
    const { bookingId, userId, amount, currency, paymentMethod, paymentDetails } = data;
    
    // Create payment record
    const payment = new Payment({
      bookingId,
      userId,
      amount,
      currency,
      paymentMethod,
      paymentDetails: {
        cardNumber: paymentDetails.cardNumber ? `****${paymentDetails.cardNumber.slice(-4)}` : undefined,
        cardHolderName: paymentDetails.cardHolderName,
        expiryMonth: paymentDetails.expiryMonth,
        expiryYear: paymentDetails.expiryYear
      },
      status: 'processing',
      transactionId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
    await payment.save();
    
    // Process payment with gateway
    const gatewayResult = await processPaymentWithGateway(data);
    
    if (gatewayResult.success) {
      payment.status = 'completed';
      payment.gatewayTransactionId = gatewayResult.gatewayTransactionId;
      payment.processedAt = new Date();
      payment.updatedAt = new Date();
      await payment.save();
      
      await publishEvent('payment.completed', {
        paymentId: payment._id,
        bookingId: payment.bookingId,
        userId: payment.userId,
        amount: payment.amount,
        transactionId: payment.transactionId
      });
    } else {
      payment.status = 'failed';
      payment.failureReason = gatewayResult.error;
      payment.updatedAt = new Date();
      await payment.save();
      
      await publishEvent('payment.failed', {
        paymentId: payment._id,
        bookingId: payment.bookingId,
        userId: payment.userId,
        amount: payment.amount,
        reason: gatewayResult.error
      });
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    await publishEvent('payment.failed', {
      bookingId: data.bookingId,
      userId: data.userId,
      reason: 'Internal processing error'
    });
  }
}

// Handle payment refund
async function handlePaymentRefund(data) {
  try {
    const { paymentId, refundAmount } = data;
    
    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status !== 'completed') {
      await publishEvent('payment.refund_failed', {
        paymentId,
        reason: 'Payment not found or not eligible for refund'
      });
      return;
    }
    
    // Simulate refund processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    payment.status = 'refunded';
    payment.refundAmount = refundAmount || payment.amount;
    payment.refundedAt = new Date();
    payment.updatedAt = new Date();
    await payment.save();
    
    await publishEvent('payment.refunded', {
      paymentId: payment._id,
      bookingId: payment.bookingId,
      userId: payment.userId,
      refundAmount: payment.refundAmount
    });
  } catch (error) {
    console.error('Payment refund error:', error);
    await publishEvent('payment.refund_failed', {
      paymentId: data.paymentId,
      reason: 'Internal refund processing error'
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
      service: 'payment-service'
    });
    
    channel.publish('payment_events', eventType, Buffer.from(message));
    console.log(`Published event: ${eventType}`);
  }
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'payment-service' });
});

// Get payment by ID
app.get('/api/payments/:paymentId', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ payment });
  } catch (error) {
    console.error('Payment fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payments by user
app.get('/api/users/:userId/payments', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const payments = await Payment.find({ userId })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments({ userId });

    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('User payments fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment by booking
app.get('/api/bookings/:bookingId/payment', async (req, res) => {
  try {
    const payment = await Payment.findOne({ bookingId: req.params.bookingId });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found for this booking' });
    }

    res.json({ payment });
  } catch (error) {
    console.error('Booking payment fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process payment (direct API call)
app.post('/api/payments', async (req, res) => {
  try {
    const { bookingId, userId, amount, currency, paymentMethod, paymentDetails } = req.body;

    // Validate required fields
    if (!bookingId || !userId || !amount || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required payment information' });
    }

    // Trigger payment processing
    await handlePaymentProcessing({
      bookingId,
      userId,
      amount,
      currency: currency || 'USD',
      paymentMethod,
      paymentDetails
    });

    res.json({ message: 'Payment processing initiated' });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refund payment
app.post('/api/payments/:paymentId/refund', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { refundAmount } = req.body;

    await handlePaymentRefund({ paymentId, refundAmount });

    res.json({ message: 'Refund processing initiated' });
  } catch (error) {
    console.error('Refund initiation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Payment Service running on port ${PORT}`);
  await connectRabbitMQ();
});

module.exports = app;

