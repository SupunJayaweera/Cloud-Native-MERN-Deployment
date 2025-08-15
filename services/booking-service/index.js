// Refactored! Please use server.js as the entry point.
// Main logic is now split into:
// - models/Booking.js (Booking and SagaState schemas)
// - routes/bookingRoutes.js (API routes)
// - utils/rabbitmq.js (RabbitMQ connection and messaging)
// - utils/saga.js (Booking saga orchestration)
// - utils/eventHandlers.js (Event handling logic)
// - app.js (Express app setup)
// - server.js (Server startup)

// Booking Schema
const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  hotelId: { type: mongoose.Schema.Types.ObjectId, required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, required: true },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  numberOfGuests: { type: Number, required: true, min: 1 },
  totalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "USD" },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "failed"],
    default: "pending",
  },
  paymentId: { type: mongoose.Schema.Types.ObjectId },
  guestDetails: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
  },
  specialRequests: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Booking = mongoose.model("Booking", bookingSchema);

// Saga State Schema
const sagaStateSchema = new mongoose.Schema({
  sagaId: { type: String, required: true, unique: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, required: true },
  currentStep: { type: String, required: true },
  status: {
    type: String,
    enum: ["running", "completed", "failed", "compensating"],
    default: "running",
  },
  steps: [
    {
      stepName: { type: String, required: true },
      status: {
        type: String,
        enum: ["pending", "completed", "failed", "compensated"],
        default: "pending",
      },
      data: { type: mongoose.Schema.Types.Mixed },
      completedAt: { type: Date },
      error: { type: String },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const SagaState = mongoose.model("SagaState", sagaStateSchema);

// RabbitMQ Connection
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
        case "room.reserved":
          await handleRoomReserved(event.data);
          break;
        case "room.reservation_failed":
          await handleRoomReservationFailed(event.data);
          break;
        case "payment.completed":
          await handlePaymentCompleted(event.data);
          break;
        case "payment.failed":
          await handlePaymentFailed(event.data);
          break;
      }

      channel.ack(msg);
    } catch (error) {
      console.error("Event handling error:", error);
      channel.nack(msg, false, true);
    }
  }
}

// Publish event
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

// Saga Orchestrator Functions

// Create new booking saga
async function createBookingSaga(bookingData) {
  const sagaId = `saga_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Create booking record
  const booking = new Booking(bookingData);
  await booking.save();

  // Create saga state
  const sagaState = new SagaState({
    sagaId,
    bookingId: booking._id,
    currentStep: "reserve_room",
    steps: [
      { stepName: "reserve_room", status: "pending" },
      { stepName: "process_payment", status: "pending" },
      { stepName: "confirm_booking", status: "pending" },
      { stepName: "send_notification", status: "pending" },
    ],
  });

  await sagaState.save();

  // Start the saga
  await executeNextStep(sagaState);

  return { booking, sagaState };
}

// Execute next step in saga
async function executeNextStep(sagaState) {
  try {
    switch (sagaState.currentStep) {
      case "reserve_room":
        await reserveRoom(sagaState);
        break;
      case "process_payment":
        await processPayment(sagaState);
        break;
      case "confirm_booking":
        await confirmBooking(sagaState);
        break;
      case "send_notification":
        await sendNotification(sagaState);
        break;
      default:
        console.log("Saga completed:", sagaState.sagaId);
        sagaState.status = "completed";
        await sagaState.save();
    }
  } catch (error) {
    console.error("Saga step execution error:", error);
    await handleSagaFailure(sagaState, error.message);
  }
}

// Step 1: Reserve room
async function reserveRoom(sagaState) {
  const booking = await Booking.findById(sagaState.bookingId);

  await publishEvent("room.reserve", {
    roomId: booking.roomId,
    bookingId: booking._id,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
  });

  // Update saga step
  const stepIndex = sagaState.steps.findIndex(
    (s) => s.stepName === "reserve_room"
  );
  sagaState.steps[stepIndex].status = "pending";
  sagaState.updatedAt = new Date();
  await sagaState.save();
}

// Step 2: Process payment
async function processPayment(sagaState) {
  const booking = await Booking.findById(sagaState.bookingId);

  await publishEvent("payment.process", {
    bookingId: booking._id,
    userId: booking.userId,
    amount: booking.totalAmount,
    currency: booking.currency,
    paymentMethod: "credit_card", // This would come from the request
    paymentDetails: {}, // This would come from the request
  });

  // Update saga step
  const stepIndex = sagaState.steps.findIndex(
    (s) => s.stepName === "process_payment"
  );
  sagaState.steps[stepIndex].status = "pending";
  sagaState.updatedAt = new Date();
  await sagaState.save();
}

// Step 3: Confirm booking
async function confirmBooking(sagaState) {
  const booking = await Booking.findById(sagaState.bookingId);

  booking.status = "confirmed";
  booking.updatedAt = new Date();
  await booking.save();

  await publishEvent("booking.confirmed", {
    bookingId: booking._id,
    userId: booking.userId,
    userEmail: booking.guestDetails.email,
    firstName: booking.guestDetails.firstName,
    hotelId: booking.hotelId,
    roomId: booking.roomId,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    totalAmount: booking.totalAmount,
  });

  // Update saga step
  const stepIndex = sagaState.steps.findIndex(
    (s) => s.stepName === "confirm_booking"
  );
  sagaState.steps[stepIndex].status = "completed";
  sagaState.steps[stepIndex].completedAt = new Date();
  sagaState.currentStep = "send_notification";
  sagaState.updatedAt = new Date();
  await sagaState.save();

  await executeNextStep(sagaState);
}

// Step 4: Send notification
async function sendNotification(sagaState) {
  const booking = await Booking.findById(sagaState.bookingId);

  await publishEvent("notification.send", {
    userId: booking.userId,
    type: "email",
    recipient: booking.guestDetails.email,
    subject: "Booking Confirmation",
    content: `Your booking has been confirmed. Booking ID: ${booking._id}`,
    templateData: {
      bookingId: booking._id,
      firstName: booking.guestDetails.firstName,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
    },
  });

  // Update saga step
  const stepIndex = sagaState.steps.findIndex(
    (s) => s.stepName === "send_notification"
  );
  sagaState.steps[stepIndex].status = "completed";
  sagaState.steps[stepIndex].completedAt = new Date();
  sagaState.status = "completed";
  sagaState.updatedAt = new Date();
  await sagaState.save();

  console.log("Booking saga completed:", sagaState.sagaId);
}

// Handle room reserved event
async function handleRoomReserved(data) {
  const { bookingId, roomId, pricePerNight } = data;

  const sagaState = await SagaState.findOne({ bookingId });
  if (!sagaState) return;

  // Update saga step
  const stepIndex = sagaState.steps.findIndex(
    (s) => s.stepName === "reserve_room"
  );
  sagaState.steps[stepIndex].status = "completed";
  sagaState.steps[stepIndex].completedAt = new Date();
  sagaState.steps[stepIndex].data = { roomId, pricePerNight };
  sagaState.currentStep = "process_payment";
  sagaState.updatedAt = new Date();
  await sagaState.save();

  await executeNextStep(sagaState);
}

// Handle room reservation failed event
async function handleRoomReservationFailed(data) {
  const { bookingId, reason } = data;

  const sagaState = await SagaState.findOne({ bookingId });
  if (!sagaState) return;

  await handleSagaFailure(sagaState, `Room reservation failed: ${reason}`);
}

// Handle payment completed event
async function handlePaymentCompleted(data) {
  const { bookingId, paymentId, transactionId } = data;

  const sagaState = await SagaState.findOne({ bookingId });
  if (!sagaState) return;

  // Update booking with payment info
  await Booking.findByIdAndUpdate(bookingId, {
    paymentId,
    updatedAt: new Date(),
  });

  // Update saga step
  const stepIndex = sagaState.steps.findIndex(
    (s) => s.stepName === "process_payment"
  );
  sagaState.steps[stepIndex].status = "completed";
  sagaState.steps[stepIndex].completedAt = new Date();
  sagaState.steps[stepIndex].data = { paymentId, transactionId };
  sagaState.currentStep = "confirm_booking";
  sagaState.updatedAt = new Date();
  await sagaState.save();

  await executeNextStep(sagaState);
}

// Handle payment failed event
async function handlePaymentFailed(data) {
  const { bookingId, reason } = data;

  const sagaState = await SagaState.findOne({ bookingId });
  if (!sagaState) return;

  await handleSagaFailure(sagaState, `Payment failed: ${reason}`);
}

// Handle saga failure and initiate compensation
async function handleSagaFailure(sagaState, errorMessage) {
  console.log("Saga failed:", sagaState.sagaId, errorMessage);

  sagaState.status = "compensating";
  sagaState.updatedAt = new Date();
  await sagaState.save();

  // Update booking status
  await Booking.findByIdAndUpdate(sagaState.bookingId, {
    status: "failed",
    updatedAt: new Date(),
  });

  // Initiate compensation transactions
  await compensateBookingSaga(sagaState);
}

// Compensate booking saga
async function compensateBookingSaga(sagaState) {
  // Compensate in reverse order
  const completedSteps = sagaState.steps
    .filter((s) => s.status === "completed")
    .reverse();

  for (const step of completedSteps) {
    try {
      switch (step.stepName) {
        case "reserve_room":
          await publishEvent("room.release", {
            roomId: step.data.roomId,
            bookingId: sagaState.bookingId,
          });
          break;
        case "process_payment":
          await publishEvent("payment.refund", {
            paymentId: step.data.paymentId,
            refundAmount: null, // Full refund
          });
          break;
      }

      step.status = "compensated";
    } catch (error) {
      console.error("Compensation error:", error);
    }
  }

  sagaState.status = "failed";
  sagaState.updatedAt = new Date();
  await sagaState.save();

  // Send failure notification
  const booking = await Booking.findById(sagaState.bookingId);
  await publishEvent("booking.cancelled", {
    bookingId: booking._id,
    userId: booking.userId,
    userEmail: booking.guestDetails.email,
    firstName: booking.guestDetails.firstName,
    reason: "Booking failed during processing",
  });
}

// Routes

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "booking-service" });
});

// Create booking
app.post("/api/bookings", async (req, res) => {
  try {
    const {
      userId,
      hotelId,
      roomId,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      totalAmount,
      guestDetails,
      specialRequests,
    } = req.body;

    // Validate required fields
    if (
      !userId ||
      !hotelId ||
      !roomId ||
      !checkInDate ||
      !checkOutDate ||
      !numberOfGuests ||
      !totalAmount ||
      !guestDetails
    ) {
      return res
        .status(400)
        .json({ error: "Missing required booking information" });
    }

    // Create booking saga
    const { booking, sagaState } = await createBookingSaga({
      userId,
      hotelId,
      roomId,
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      numberOfGuests,
      totalAmount,
      guestDetails,
      specialRequests,
    });

    res.status(201).json({
      message: "Booking initiated",
      booking,
      sagaId: sagaState.sagaId,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get booking by ID
app.get("/api/bookings/:bookingId", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json({ booking });
  } catch (error) {
    console.error("Booking fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get bookings by user
app.get("/api/users/:userId/bookings", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("User bookings fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel booking
app.post("/api/bookings/:bookingId/cancel", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ error: "Booking already cancelled" });
    }

    if (booking.status !== "confirmed") {
      return res
        .status(400)
        .json({ error: "Only confirmed bookings can be cancelled" });
    }

    booking.status = "cancelled";
    booking.updatedAt = new Date();
    await booking.save();

    // Publish cancellation events
    await publishEvent("room.release", {
      roomId: booking.roomId,
      bookingId: booking._id,
    });

    if (booking.paymentId) {
      await publishEvent("payment.refund", {
        paymentId: booking.paymentId,
        refundAmount: booking.totalAmount,
      });
    }

    await publishEvent("booking.cancelled", {
      bookingId: booking._id,
      userId: booking.userId,
      userEmail: booking.guestDetails.email,
      firstName: booking.guestDetails.firstName,
    });

    res.json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Booking cancellation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get saga state
app.get("/api/sagas/:sagaId", async (req, res) => {
  try {
    const sagaState = await SagaState.findOne({ sagaId: req.params.sagaId });
    if (!sagaState) {
      return res.status(404).json({ error: "Saga not found" });
    }

    res.json({ sagaState });
  } catch (error) {
    console.error("Saga fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Booking Service running on port ${PORT}`);
  await connectRabbitMQ();
});

module.exports = app;
