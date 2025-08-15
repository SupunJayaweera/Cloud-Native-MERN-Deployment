const mongoose = require("mongoose");

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
      "custom",
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

// Update the updatedAt field before saving
notificationSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Notification", notificationSchema);
