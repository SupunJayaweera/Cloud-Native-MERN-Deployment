const express = require("express");
const Payment = require("../models/Payment");
const {
  handlePaymentProcessing,
  handlePaymentRefund,
} = require("../utils/rabbitmq");
const { validatePaymentDetails } = require("../utils/paymentGateway");

const router = express.Router();

// Get payment by ID
router.get("/payments/:paymentId", async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json({ payment });
  } catch (error) {
    console.error("Payment fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get payments by user
router.get("/users/:userId/payments", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(query);

    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("User payments fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get payment by booking
router.get("/bookings/:bookingId/payment", async (req, res) => {
  try {
    const payment = await Payment.findOne({ bookingId: req.params.bookingId });
    if (!payment) {
      return res
        .status(404)
        .json({ error: "Payment not found for this booking" });
    }

    res.json({ payment });
  } catch (error) {
    console.error("Booking payment fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Process payment (direct API call)
router.post("/payments", async (req, res) => {
  try {
    const {
      bookingId,
      userId,
      amount,
      currency,
      paymentMethod,
      paymentDetails,
    } = req.body;

    // Validate required fields
    if (!bookingId || !userId || !amount || !paymentMethod) {
      return res
        .status(400)
        .json({ error: "Missing required payment information" });
    }

    // Validate payment details
    const validation = validatePaymentDetails(paymentMethod, paymentDetails);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Trigger payment processing
    await handlePaymentProcessing({
      bookingId,
      userId,
      amount,
      currency: currency || "USD",
      paymentMethod,
      paymentDetails,
    });

    res.json({ message: "Payment processing initiated" });
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Refund payment
router.post("/payments/:paymentId/refund", async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { refundAmount } = req.body;

    // Validate payment exists and is eligible for refund
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status !== "completed") {
      return res
        .status(400)
        .json({ error: "Payment is not eligible for refund" });
    }

    if (refundAmount && refundAmount > payment.amount) {
      return res
        .status(400)
        .json({ error: "Refund amount cannot exceed payment amount" });
    }

    await handlePaymentRefund({ paymentId, refundAmount });

    res.json({ message: "Refund processing initiated" });
  } catch (error) {
    console.error("Refund initiation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get payment statistics for admin
router.get("/payments/stats", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchConditions = {};
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }

    const stats = await Payment.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const totalPayments = await Payment.countDocuments(matchConditions);
    const totalRevenue = await Payment.aggregate([
      { $match: { ...matchConditions, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      stats,
      totalPayments,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    console.error("Payment stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
