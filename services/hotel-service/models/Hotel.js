const mongoose = require("mongoose");

// Hotel Schema
const hotelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zipCode: { type: String, required: true },
  },
  contact: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  amenities: [{ type: String }],
  images: [{ type: String }],
  rating: { type: Number, min: 0, max: 5, default: 0 },
  totalRooms: { type: Number, required: true, min: 1 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Hotel = mongoose.model("Hotel", hotelSchema);

module.exports = Hotel;
