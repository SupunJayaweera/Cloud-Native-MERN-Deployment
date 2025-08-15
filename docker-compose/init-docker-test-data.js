const mongoose = require("mongoose");

// Service URLs for Docker environment
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://user-service:3001";
const HOTEL_SERVICE_URL =
  process.env.HOTEL_SERVICE_URL || "http://hotel-service:3002";
const ROOM_SERVICE_URL =
  process.env.ROOM_SERVICE_URL || "http://room-service:3003";

async function initializeDockerTestData() {
  console.log("🚀 Initializing test data for Docker environment...");

  try {
    // Connect to each database (from host machine to Docker containers)
    const connections = {
      user: await mongoose.createConnection(
        "mongodb://admin:password123@localhost:27017/userdb?authSource=admin"
      ),
      hotel: await mongoose.createConnection(
        "mongodb://admin:password123@localhost:27018/hoteldb?authSource=admin"
      ),
      room: await mongoose.createConnection(
        "mongodb://admin:password123@localhost:27019/roomdb?authSource=admin"
      ),
      booking: await mongoose.createConnection(
        "mongodb://admin:password123@localhost:27020/bookingdb?authSource=admin"
      ),
      payment: await mongoose.createConnection(
        "mongodb://admin:password123@localhost:27021/paymentdb?authSource=admin"
      ),
      notification: await mongoose.createConnection(
        "mongodb://admin:password123@localhost:27022/notificationdb?authSource=admin"
      ),
    };

    console.log("✅ Connected to all MongoDB instances");

    // Clear existing data
    await Promise.all([
      connections.user.dropDatabase(),
      connections.hotel.dropDatabase(),
      connections.room.dropDatabase(),
      connections.booking.dropDatabase(),
      connections.payment.dropDatabase(),
      connections.notification.dropDatabase(),
    ]);

    console.log("🗑️ Cleared all existing data");

    // Define schemas
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: { type: String, default: "user" },
    });

    const hotelSchema = new mongoose.Schema({
      name: { type: String, unique: true },
      description: String,
      address: String,
      phone: String,
      email: String,
      rating: Number,
      amenities: [String],
      images: [String],
    });

    const roomSchema = new mongoose.Schema({
      hotelId: String,
      roomNumber: String,
      type: String,
      capacity: Number,
      price: Number,
      amenities: [String],
      images: [String],
      isAvailable: { type: Boolean, default: true },
    });

    // Create models
    const User = connections.user.model("User", userSchema);
    const Hotel = connections.hotel.model("Hotel", hotelSchema);
    const Room = connections.room.model("Room", roomSchema);

    // Insert test users
    const users = await User.insertMany([
      {
        name: "Admin User",
        email: "admin@hotel.com",
        password:
          "$2a$10$xYzKZqfFLhLa4XcOKwjJN.K5NM7gP2n9QRPO7w8qJhFpJaKQwWqge", // password123
        role: "admin",
      },
      {
        name: "John Doe",
        email: "john@example.com",
        password:
          "$2a$10$xYzKZqfFLhLa4XcOKwjJN.K5NM7gP2n9QRPO7w8qJhFpJaKQwWqge", // password123
        role: "user",
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        password:
          "$2a$10$xYzKZqfFLhLa4XcOKwjJN.K5NM7gP2n9QRPO7w8qJhFpJaKQwWqge", // password123
        role: "user",
      },
    ]);

    console.log("👥 Created test users");

    // Insert test hotels
    const hotels = await Hotel.insertMany([
      {
        name: "Grand Plaza Hotel",
        description:
          "A luxurious 5-star hotel in the heart of the city with world-class amenities and exceptional service.",
        address: "123 Main Street, City Center, New York, NY 10001",
        phone: "+1-555-0123",
        email: "info@grandplaza.com",
        rating: 4.8,
        amenities: [
          "Free WiFi",
          "Swimming Pool",
          "Spa",
          "Fitness Center",
          "Restaurant",
          "Room Service",
          "Concierge",
          "Valet Parking",
        ],
        images: ["/grand-plaza.jpg"],
      },
      {
        name: "Ocean View Resort",
        description:
          "Beachfront resort offering stunning ocean views and a perfect getaway for relaxation.",
        address: "456 Ocean Drive, Miami Beach, FL 33139",
        phone: "+1-555-0456",
        email: "reservations@oceanview.com",
        rating: 4.6,
        amenities: [
          "Beach Access",
          "Free WiFi",
          "Swimming Pool",
          "Beach Bar",
          "Water Sports",
          "Spa",
          "Restaurant",
        ],
        images: ["/ocean-view.jpg"],
      },
      {
        name: "Mountain Lodge",
        description:
          "Cozy mountain retreat perfect for nature lovers and adventure seekers.",
        address: "789 Mountain Trail, Aspen, CO 81611",
        phone: "+1-555-0789",
        email: "bookings@mountainlodge.com",
        rating: 4.4,
        amenities: [
          "Mountain Views",
          "Hiking Trails",
          "Fireplace",
          "Free WiFi",
          "Restaurant",
          "Ski Storage",
        ],
        images: ["/mountain-lodge.jpg"],
      },
    ]);

    console.log("🏨 Created test hotels");

    // Insert test rooms
    const rooms = [];
    hotels.forEach((hotel, hotelIndex) => {
      for (let floor = 1; floor <= 3; floor++) {
        for (let roomNum = 1; roomNum <= 10; roomNum++) {
          const roomNumber = `${floor}${roomNum.toString().padStart(2, "0")}`;
          const roomTypes = ["Standard", "Deluxe", "Suite"];
          const roomType =
            roomTypes[Math.floor(Math.random() * roomTypes.length)];

          let price, capacity, amenities;
          switch (roomType) {
            case "Standard":
              price = 150 + hotelIndex * 50;
              capacity = 2;
              amenities = [
                "Free WiFi",
                "Air Conditioning",
                "TV",
                "Mini Fridge",
              ];
              break;
            case "Deluxe":
              price = 250 + hotelIndex * 50;
              capacity = 3;
              amenities = [
                "Free WiFi",
                "Air Conditioning",
                "TV",
                "Mini Fridge",
                "Balcony",
                "Coffee Maker",
              ];
              break;
            case "Suite":
              price = 400 + hotelIndex * 50;
              capacity = 4;
              amenities = [
                "Free WiFi",
                "Air Conditioning",
                "TV",
                "Mini Fridge",
                "Balcony",
                "Coffee Maker",
                "Separate Living Area",
                "Jacuzzi",
              ];
              break;
          }

          rooms.push({
            hotelId: hotel._id.toString(),
            roomNumber,
            type: roomType,
            capacity,
            price,
            amenities,
            images: [`/room-${roomType.toLowerCase()}.jpg`],
            isAvailable: true,
          });
        }
      }
    });

    await Room.insertMany(rooms);
    console.log("🛏️ Created test rooms");

    // Close connections
    await Promise.all(Object.values(connections).map((conn) => conn.close()));

    console.log("✅ Docker test data initialization completed successfully!");
    console.log("\n📊 Data Summary:");
    console.log(`- Users: ${users.length}`);
    console.log(`- Hotels: ${hotels.length}`);
    console.log(`- Rooms: ${rooms.length}`);
    console.log("\n🔑 Test Credentials:");
    console.log("Admin: admin@hotel.com / password123");
    console.log("User 1: john@example.com / password123");
    console.log("User 2: jane@example.com / password123");
  } catch (error) {
    console.error("❌ Error initializing Docker test data:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDockerTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

module.exports = initializeDockerTestData;
