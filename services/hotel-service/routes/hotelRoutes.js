const express = require("express");
const Hotel = require("../models/Hotel");
const { publishEvent } = require("../utils/rabbitmq");
const { adminAuth } = require("../middleware/adminAuth");

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "hotel-service" });
});

// Get all hotels
router.get("/api/hotels", async (req, res) => {
  try {
    const { city, country, page = 1, limit = 10 } = req.query;
    const query = { isActive: true };

    if (city) {
      query["address.city"] = new RegExp(city, "i");
    }
    if (country) {
      query["address.country"] = new RegExp(country, "i");
    }

    const hotels = await Hotel.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ rating: -1, createdAt: -1 });

    const total = await Hotel.countDocuments(query);

    res.json({
      hotels,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Hotels fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get hotel by ID
router.get("/api/hotels/:hotelId", async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel || !hotel.isActive) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    res.json({ hotel });
  } catch (error) {
    console.error("Hotel fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create hotel (admin only)
router.post("/api/hotels", adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      contact,
      amenities,
      images,
      totalRooms,
    } = req.body;

    const hotel = new Hotel({
      name,
      description,
      address,
      contact,
      amenities: amenities || [],
      images: images || [],
      totalRooms,
    });

    await hotel.save();

    // Publish hotel created event
    await publishEvent("hotel.created", {
      hotelId: hotel._id,
      name: hotel.name,
      city: hotel.address.city,
      country: hotel.address.country,
      totalRooms: hotel.totalRooms,
    });

    res.status(201).json({
      message: "Hotel created successfully",
      hotel,
    });
  } catch (error) {
    console.error("Hotel creation error:", error);

    // Handle duplicate name error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      return res.status(400).json({
        error: "Hotel name already exists",
        message: `A hotel with the name "${req.body.name}" already exists`,
        code: 11000,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        error: "Validation error",
        message: validationErrors.join(", "),
      });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

// Update hotel (admin only)
router.put("/api/hotels/:hotelId", adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      contact,
      amenities,
      images,
      totalRooms,
    } = req.body;

    const hotel = await Hotel.findByIdAndUpdate(
      req.params.hotelId,
      {
        name,
        description,
        address,
        contact,
        amenities,
        images,
        totalRooms,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    // Publish hotel updated event
    await publishEvent("hotel.updated", {
      hotelId: hotel._id,
      name: hotel.name,
      city: hotel.address.city,
      country: hotel.address.country,
      totalRooms: hotel.totalRooms,
    });

    res.json({
      message: "Hotel updated successfully",
      hotel,
    });
  } catch (error) {
    console.error("Hotel update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete hotel (soft delete) (admin only)
router.delete("/api/hotels/:hotelId", adminAuth, async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.hotelId,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    // Publish hotel deleted event
    await publishEvent("hotel.deleted", {
      hotelId: hotel._id,
      name: hotel.name,
    });

    res.json({ message: "Hotel deleted successfully" });
  } catch (error) {
    console.error("Hotel deletion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Search hotels
router.get("/api/hotels/search", async (req, res) => {
  try {
    const {
      query: searchQuery,
      city,
      country,
      minRating = 0,
      page = 1,
      limit = 10,
    } = req.query;

    const query = { isActive: true };

    if (searchQuery) {
      query.$or = [
        { name: new RegExp(searchQuery, "i") },
        { description: new RegExp(searchQuery, "i") },
      ];
    }

    if (city) {
      query["address.city"] = new RegExp(city, "i");
    }

    if (country) {
      query["address.country"] = new RegExp(country, "i");
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    const hotels = await Hotel.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ rating: -1, createdAt: -1 });

    const total = await Hotel.countDocuments(query);

    res.json({
      hotels,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      searchQuery,
    });
  } catch (error) {
    console.error("Hotel search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
