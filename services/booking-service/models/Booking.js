const mongoose = require("mongoose");

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

const Booking = mongoose.model("Booking", bookingSchema);
const SagaState = mongoose.model("SagaState", sagaStateSchema);

module.exports = { Booking, SagaState };
