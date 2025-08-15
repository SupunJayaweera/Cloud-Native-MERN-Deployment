const mongoose = require("mongoose");

// Payment Schema
const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: "USD" },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["credit_card", "debit_card", "paypal", "bank_transfer"],
  },
  paymentDetails: {
    cardNumber: { type: String }, // Last 4 digits only
    cardHolderName: { type: String },
    expiryMonth: { type: Number },
    expiryYear: { type: Number },
  },
  transactionId: { type: String, unique: true },
  gatewayTransactionId: { type: String },
  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "completed",
      "failed",
      "refunded",
      "cancelled",
    ],
    default: "pending",
  },
  failureReason: { type: String },
  processedAt: { type: Date },
  refundedAt: { type: Date },
  refundAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt field before saving
paymentSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Payment", paymentSchema);
