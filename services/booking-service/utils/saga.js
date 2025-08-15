const { Booking, SagaState } = require("../models/Booking");
const { publishEvent } = require("./rabbitmq");

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
    paymentMethod: "credit_card",
    paymentDetails: {},
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

// Handle saga failure and compensation
async function handleSagaFailure(sagaState, errorMessage) {
  console.log("Handling saga failure:", sagaState.sagaId, errorMessage);

  sagaState.status = "compensating";
  sagaState.updatedAt = new Date();
  await sagaState.save();

  // Compensate completed steps in reverse order
  const completedSteps = sagaState.steps
    .filter((s) => s.status === "completed")
    .reverse();

  for (const step of completedSteps) {
    try {
      await compensateStep(step.stepName, sagaState);
    } catch (compensationError) {
      console.error(
        `Compensation failed for step ${step.stepName}:`,
        compensationError
      );
    }
  }

  sagaState.status = "failed";
  await sagaState.save();

  // Mark booking as failed
  const booking = await Booking.findById(sagaState.bookingId);
  booking.status = "failed";
  await booking.save();
}

// Compensate individual steps
async function compensateStep(stepName, sagaState) {
  const booking = await Booking.findById(sagaState.bookingId);

  switch (stepName) {
    case "reserve_room":
      await publishEvent("room.release", {
        roomId: booking.roomId,
        bookingId: booking._id,
      });
      break;
    case "process_payment":
      if (booking.paymentId) {
        await publishEvent("payment.refund", {
          paymentId: booking.paymentId,
          bookingId: booking._id,
        });
      }
      break;
    case "confirm_booking":
      await publishEvent("booking.cancelled", {
        bookingId: booking._id,
        userId: booking.userId,
      });
      break;
  }
}

module.exports = {
  createBookingSaga,
  executeNextStep,
  handleSagaFailure,
  reserveRoom,
  processPayment,
  confirmBooking,
  sendNotification,
};
