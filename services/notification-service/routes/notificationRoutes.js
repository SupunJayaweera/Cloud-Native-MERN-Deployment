const express = require("express");
const Notification = require("../models/Notification");
const {
  sendCustomNotification,
  sendNotification,
} = require("../utils/rabbitmq");

const router = express.Router();

// Get notifications by user
router.get("/users/:userId/notifications", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status, type } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Notification.countDocuments(query);

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get notification statistics (must come before /:notificationId route)
router.get("/notifications/stats", async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const matchConditions = {};
    if (userId) {
      matchConditions.userId = userId;
    }
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }

    const stats = await Notification.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            status: "$status",
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = {
      total: 0,
      byStatus: {},
      byType: {},
    };

    stats.forEach((stat) => {
      summary.total += stat.count;
      summary.byStatus[stat._id.status] =
        (summary.byStatus[stat._id.status] || 0) + stat.count;
      summary.byType[stat._id.type] =
        (summary.byType[stat._id.type] || 0) + stat.count;
    });

    res.json(summary);
  } catch (error) {
    console.error("Error getting notification stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get notification by ID
router.get("/notifications/:notificationId", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.notificationId);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ notification });
  } catch (error) {
    console.error("Notification fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send custom notification
router.post("/notifications", async (req, res) => {
  try {
    const { userId, type, recipient, subject, content, templateData } =
      req.body;

    // Validate required fields
    if (!userId || !type || !recipient || !content) {
      return res.status(400).json({
        error: "Missing required fields: userId, type, recipient, content",
      });
    }

    // Validate notification type
    if (!["email", "sms", "push"].includes(type)) {
      return res.status(400).json({
        error: "Invalid notification type. Must be email, sms, or push",
      });
    }

    await sendCustomNotification({
      userId,
      type,
      recipient,
      subject,
      content,
      templateData,
    });

    res.json({ message: "Notification queued for sending" });
  } catch (error) {
    console.error("Custom notification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Retry failed notifications
router.post("/notifications/:notificationId/retry", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.notificationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.status !== "failed") {
      return res.status(400).json({
        error: "Only failed notifications can be retried",
      });
    }

    if (notification.retryCount >= notification.maxRetries) {
      return res.status(400).json({
        error: "Maximum retry attempts exceeded",
      });
    }

    await sendNotification(notification);

    res.json({ message: "Notification retry initiated" });
  } catch (error) {
    console.error("Notification retry error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark notification as read/delivered
router.patch("/notifications/:notificationId/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["sent", "delivered", "failed"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be sent, delivered, or failed",
      });
    }

    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      {
        status,
        ...(status === "delivered" && { deliveredAt: new Date() }),
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({
      message: "Notification status updated",
      notification,
    });
  } catch (error) {
    console.error("Notification status update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
