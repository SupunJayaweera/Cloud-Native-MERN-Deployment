const mongoose = require("mongoose");

// Room Schema
const roomSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Hotel",
  },
  roomNumber: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["single", "double", "suite", "deluxe", "family"],
  },
  capacity: { type: Number, required: true, min: 1 },
  pricePerNight: { type: Number, required: true, min: 0 },
  description: { type: String },
  amenities: [{ type: String }],
  images: [{ type: String }],
  status: {
    type: String,
    enum: ["available", "occupied", "maintenance", "reserved"],
    default: "available",
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Compound index for hotel and room number uniqueness
roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });

// Update the updatedAt field before saving
roomSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Room", roomSchema);
