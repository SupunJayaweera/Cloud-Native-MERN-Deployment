const express = require("express");
const Room = require("../models/Room");
const { publishEvent } = require("../utils/rabbitmq");
const { adminAuth } = require("../middleware/adminAuth");

const router = express.Router();

// Get rooms by hotel
router.get("/hotels/:hotelId/rooms", async (req, res) => {
  try {
    const { hotelId } = req.params;
    const {
      type,
      minPrice,
      maxPrice,
      available,
      page = 1,
      limit = 10,
    } = req.query;

    const query = { hotelId, isActive: true };

    if (type) {
      query.type = type;
    }

    if (minPrice || maxPrice) {
      query.pricePerNight = {};
      if (minPrice) query.pricePerNight.$gte = parseFloat(minPrice);
      if (maxPrice) query.pricePerNight.$lte = parseFloat(maxPrice);
    }

    if (available === "true") {
      query.status = "available";
    }

    const rooms = await Room.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ pricePerNight: 1 });

    const total = await Room.countDocuments(query);

    res.json({
      rooms,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Rooms fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get room by ID
router.get("/rooms/:roomId", async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room || !room.isActive) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json({ room });
  } catch (error) {
    console.error("Room fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create room (admin only)
router.post("/hotels/:hotelId/rooms", adminAuth, async (req, res) => {
  try {
    const { hotelId } = req.params;
    const {
      roomNumber,
      type,
      capacity,
      pricePerNight,
      description,
      amenities,
      images,
    } = req.body;

    const room = new Room({
      hotelId,
      roomNumber,
      type,
      capacity,
      pricePerNight,
      description,
      amenities: amenities || [],
      images: images || [],
    });

    await room.save();

    // Publish room created event
    await publishEvent("room.created", {
      roomId: room._id,
      hotelId: room.hotelId,
      roomNumber: room.roomNumber,
      type: room.type,
      pricePerNight: room.pricePerNight,
    });

    res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error("Room creation error:", error);
    if (error.code === 11000) {
      res
        .status(400)
        .json({ error: "Room number already exists for this hotel" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Update room (admin only)
router.put("/rooms/:roomId", adminAuth, async (req, res) => {
  try {
    const {
      roomNumber,
      type,
      capacity,
      pricePerNight,
      description,
      amenities,
      images,
      status,
    } = req.body;

    const room = await Room.findByIdAndUpdate(
      req.params.roomId,
      {
        roomNumber,
        type,
        capacity,
        pricePerNight,
        description,
        amenities,
        images,
        status,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Publish room updated event
    await publishEvent("room.updated", {
      roomId: room._id,
      hotelId: room.hotelId,
      status: room.status,
      pricePerNight: room.pricePerNight,
    });

    res.json({
      message: "Room updated successfully",
      room,
    });
  } catch (error) {
    console.error("Room update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete room (soft delete) (admin only)
router.delete("/rooms/:roomId", adminAuth, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.roomId,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Publish room deleted event
    await publishEvent("room.deleted", {
      roomId: room._id,
      hotelId: room.hotelId,
      roomNumber: room.roomNumber,
    });

    res.json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Room deletion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin routes
// Get all rooms by hotel (admin only)
router.get("/api/rooms/hotel/:hotelId", adminAuth, async (req, res) => {
  try {
    const { hotelId } = req.params;
    const rooms = await Room.find({ hotelId }).sort({ roomNumber: 1 });

    res.json({
      rooms,
      total: rooms.length,
    });
  } catch (error) {
    console.error("Admin rooms fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get room by ID (admin only)
router.get("/api/rooms/:roomId", adminAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json({ room });
  } catch (error) {
    console.error("Admin room fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create room (admin only) - using /api prefix for consistency
router.post("/api/rooms", adminAuth, async (req, res) => {
  try {
    const {
      hotelId,
      roomNumber,
      type,
      capacity,
      pricePerNight,
      description,
      amenities,
      images,
      status,
    } = req.body;

    // Check if room number already exists for this hotel
    const existingRoom = await Room.findOne({ hotelId, roomNumber });
    if (existingRoom) {
      return res.status(400).json({
        error: `Room number ${roomNumber} already exists for this hotel`,
      });
    }

    const room = new Room({
      hotelId,
      roomNumber,
      type,
      capacity,
      pricePerNight,
      description,
      amenities: amenities || [],
      images: images || [],
      status: status || "available",
    });

    await room.save();

    // Publish room created event
    await publishEvent("room.created", {
      roomId: room._id,
      hotelId,
      roomNumber,
      type,
      pricePerNight,
    });

    res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error("Room creation error:", error);
    if (error.code === 11000) {
      res
        .status(400)
        .json({ error: "Room number already exists for this hotel" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Update room (admin only)
router.put("/api/rooms/:roomId", adminAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const updateData = req.body;

    // If room number is being updated, check for conflicts
    if (updateData.roomNumber) {
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      const existingRoom = await Room.findOne({
        hotelId: room.hotelId,
        roomNumber: updateData.roomNumber,
        _id: { $ne: roomId },
      });

      if (existingRoom) {
        return res.status(400).json({
          error: `Room number ${updateData.roomNumber} already exists for this hotel`,
        });
      }
    }

    const room = await Room.findByIdAndUpdate(roomId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Publish room updated event
    await publishEvent("room.updated", {
      roomId: room._id,
      hotelId: room.hotelId,
      updateData,
    });

    res.json({
      message: "Room updated successfully",
      room,
    });
  } catch (error) {
    console.error("Room update error:", error);
    if (error.code === 11000) {
      res
        .status(400)
        .json({ error: "Room number already exists for this hotel" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Delete room (admin only)
router.delete("/api/rooms/:roomId", adminAuth, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findByIdAndDelete(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Publish room deleted event
    await publishEvent("room.deleted", {
      roomId: room._id,
      hotelId: room.hotelId,
    });

    res.json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Room deletion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check room availability
router.get("/rooms/:roomId/availability", async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res
        .status(400)
        .json({ error: "Check-in and check-out dates are required" });
    }

    const room = await Room.findById(req.params.roomId);
    if (!room || !room.isActive) {
      return res.status(404).json({ error: "Room not found" });
    }

    // For simplicity, we're just checking the current status
    // In a real system, you'd check against booking dates
    const isAvailable = room.status === "available";

    res.json({
      roomId: room._id,
      available: isAvailable,
      status: room.status,
      pricePerNight: room.pricePerNight,
    });
  } catch (error) {
    console.error("Availability check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Special initialization endpoint (no auth required) - for initial data setup only
router.post("/init/hotels/:hotelId/rooms", async (req, res) => {
  try {
    const { hotelId } = req.params;
    const {
      roomNumber,
      type,
      capacity,
      pricePerNight,
      description,
      amenities,
      images,
      status = "available",
      isActive = true,
    } = req.body;

    // Check if room already exists
    const existingRoom = await Room.findOne({ hotelId, roomNumber });
    if (existingRoom) {
      return res.status(400).json({
        error: "Room already exists",
        message: `Room ${roomNumber} already exists for this hotel`,
      });
    }

    const room = new Room({
      hotelId,
      roomNumber,
      type,
      capacity,
      pricePerNight,
      description,
      amenities: amenities || [],
      images: images || [],
      status,
      isActive,
    });

    await room.save();

    // Publish event
    await publishEvent("room_created", {
      roomId: room._id,
      hotelId,
      roomNumber,
      type,
      pricePerNight,
    });

    res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error("Room creation error:", error);
    if (error.code === 11000) {
      res
        .status(400)
        .json({ error: "Room with this number already exists for this hotel" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

module.exports = router;
