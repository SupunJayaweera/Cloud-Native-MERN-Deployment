const { Booking, SagaState } = require("../models/Booking");
const { executeNextStep, handleSagaFailure } = require("./saga");

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

      return true; // Success
    } catch (error) {
      console.error("Event handling error:", error);
      return false; // Failure
    }
  }
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

module.exports = {
  handleEvent,
  handleRoomReserved,
  handleRoomReservationFailed,
  handlePaymentCompleted,
  handlePaymentFailed,
};
