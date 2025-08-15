const express = require("express");
const { Booking, SagaState } = require("../models/Booking");
const { createBookingSaga } = require("../utils/saga");
const { publishEvent } = require("../utils/rabbitmq");

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "booking-service" });
});

// Create booking
router.post("/api/bookings", async (req, res) => {
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
router.get("/api/bookings/:bookingId", async (req, res) => {
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
router.get("/api/users/:userId/bookings", async (req, res) => {
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
router.post("/api/bookings/:bookingId/cancel", async (req, res) => {
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
router.get("/api/sagas/:sagaId", async (req, res) => {
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

module.exports = router;
