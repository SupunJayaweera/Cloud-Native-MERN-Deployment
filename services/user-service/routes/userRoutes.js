const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authenticateToken = require("../middleware/auth");
const { publishEvent } = require("../utils/rabbitmq");

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "user-service" });
});

// Register user
router.post("/api/users/register", async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone, role } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const user = new User({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: role || "guest", // Default to guest if no role specified
    });
    await user.save();
    await publishEvent("user.created", {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    const userResponse = user.toObject();
    delete userResponse.password;
    res
      .status(201)
      .json({ message: "User created successfully", user: userResponse });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login user
router.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "24h" }
    );
    await publishEvent("user.logged_in", {
      userId: user._id,
      email: user.email,
    });
    const userResponse = user.toObject();
    delete userResponse.password;
    res.json({ message: "Login successful", token, user: userResponse });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user profile
router.get("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
router.put("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { firstName, lastName, phone, updatedAt: new Date() },
      { new: true }
    ).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    await publishEvent("user.updated", {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user by ID (internal service call)
router.get("/api/users/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("User fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
