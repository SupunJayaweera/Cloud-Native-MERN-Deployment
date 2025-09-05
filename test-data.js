const axios = require("axios");

// Service URLs
const USER_SERVICE_URL = "http://localhost:3001";
const HOTEL_SERVICE_URL = "http://localhost:3002";
const ROOM_SERVICE_URL = "http://localhost:3003";
const BOOKING_SERVICE_URL = "http://localhost:3004";

// Test data
const testUsers = [
  {
    username: "john_doe",
    email: "john@example.com",
    password: "password123",
    firstName: "John",
    lastName: "Doe",
    phone: "+1234567890",
  },
  {
    username: "jane_smith",
    email: "jane@example.com",
    password: "password123",
    firstName: "Jane",
    lastName: "Smith",
    phone: "+1234567891",
  },
];

const testHotels = [
  {
    name: "Grand Plaza Hotel",
    description:
      "A luxurious 5-star hotel in the heart of the city with world-class amenities and exceptional service.",
    address: {
      street: "123 Main Street",
      city: "New York",
      state: "NY",
      country: "USA",
      zipCode: "10001",
    },
    contact: {
      phone: "+1-555-0123",
      email: "info@grandplaza.com",
    },
    amenities: [
      "WiFi",
      "Pool",
      "Gym",
      "Spa",
      "Restaurant",
      "Room Service",
      "Concierge",
    ],
    images: ["/grand-plaza.jpg"],
    totalRooms: 50,
    rating: 4.8,
    isActive: true,
  },
  {
    name: "Ocean View Resort",
    description:
      "Beautiful beachfront resort with stunning ocean views and tropical paradise atmosphere.",
    address: {
      street: "456 Beach Boulevard",
      city: "Miami",
      state: "FL",
      country: "USA",
      zipCode: "33101",
    },
    contact: {
      phone: "+1-555-0456",
      email: "reservations@oceanview.com",
    },
    amenities: [
      "WiFi",
      "Beach Access",
      "Pool",
      "Bar",
      "Restaurant",
      "Water Sports",
    ],
    images: ["/ocen-view.jpg"],
    totalRooms: 75,
    rating: 4.6,
    isActive: true,
  },
  {
    name: "Mountain Lodge",
    description:
      "Cozy mountain retreat perfect for nature lovers and adventure seekers.",
    address: {
      street: "789 Mountain Road",
      city: "Denver",
      state: "CO",
      country: "USA",
      zipCode: "80201",
    },
    contact: {
      phone: "+1-555-0789",
      email: "info@mountainlodge.com",
    },
    amenities: [
      "WiFi",
      "Fireplace",
      "Hiking Trails",
      "Restaurant",
      "Ski Access",
    ],
    images: ["/mountain-lodge.jpg"],
    totalRooms: 30,
    rating: 4.4,
    isActive: true,
  },
];

const testRooms = [
  // Grand Plaza Hotel rooms
  {
    roomNumber: "101",
    type: "single",
    capacity: 1,
    pricePerNight: 150,
    description: "Comfortable single room with city view",
    amenities: ["WiFi", "TV", "Air Conditioning", "Mini Bar"],
    status: "available",
    isActive: true,
  },
  {
    roomNumber: "102",
    type: "double",
    capacity: 2,
    pricePerNight: 200,
    description: "Spacious double room with king-size bed",
    amenities: ["WiFi", "TV", "Air Conditioning", "Mini Bar", "Balcony"],
    status: "available",
    isActive: true,
  },
  {
    roomNumber: "201",
    type: "suite",
    capacity: 4,
    pricePerNight: 350,
    description: "Luxury suite with separate living area",
    amenities: [
      "WiFi",
      "TV",
      "Air Conditioning",
      "Mini Bar",
      "Balcony",
      "Jacuzzi",
    ],
    status: "available",
    isActive: true,
  },
  // Ocean View Resort rooms
  {
    roomNumber: "301",
    type: "double",
    capacity: 2,
    pricePerNight: 180,
    description: "Ocean view room with private balcony",
    amenities: ["WiFi", "TV", "Air Conditioning", "Ocean View", "Balcony"],
    status: "available",
    isActive: true,
  },
  {
    roomNumber: "302",
    type: "family",
    capacity: 6,
    pricePerNight: 280,
    description: "Family room with bunk beds and ocean view",
    amenities: ["WiFi", "TV", "Air Conditioning", "Ocean View", "Kitchenette"],
    status: "available",
    isActive: true,
  },
  // Mountain Lodge rooms
  {
    roomNumber: "401",
    type: "single",
    capacity: 1,
    pricePerNight: 120,
    description: "Cozy single room with mountain view",
    amenities: ["WiFi", "TV", "Heating", "Mountain View"],
    status: "available",
    isActive: true,
  },
  {
    roomNumber: "402",
    type: "deluxe",
    capacity: 3,
    pricePerNight: 220,
    description: "Deluxe room with fireplace and mountain view",
    amenities: ["WiFi", "TV", "Heating", "Mountain View", "Fireplace"],
    status: "available",
    isActive: true,
  },
];

async function createUser(userData) {
  try {
    console.log(`Creating user: ${userData.email}`);
    const response = await axios.post(
      `${USER_SERVICE_URL}/api/users/register`,
      userData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    console.log(`✓ Created user: ${userData.email}`);
    return response.data;
  } catch (error) {
    console.log(
      `✗ Failed to create user ${userData.email}:`,
      error.response?.data?.message || error.response?.data || error.message
    );
    // Log more details for debugging
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
    return null;
  }
}

async function createHotel(hotelData) {
  try {
    console.log(`Creating hotel: ${hotelData.name}`);
    const response = await axios.post(
      `${HOTEL_SERVICE_URL}/api/hotels`,
      hotelData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    console.log(`✓ Created hotel: ${hotelData.name}`);
    return response.data;
  } catch (error) {
    // Check if it's a duplicate name error
    if (
      error.response?.status === 400 &&
      (error.response?.data?.message?.includes("duplicate") ||
        error.response?.data?.message?.includes("E11000") ||
        error.response?.data?.code === 11000)
    ) {
      console.log(`⚠ Hotel "${hotelData.name}" already exists, skipping...`);
      // Try to get the existing hotel
      try {
        const existingResponse = await axios.get(
          `${HOTEL_SERVICE_URL}/api/hotels`
        );
        const hotelsData =
          existingResponse.data.hotels || existingResponse.data;
        const existingHotel = hotelsData.find((h) => h.name === hotelData.name);
        if (existingHotel) {
          return existingHotel;
        }
      } catch (getError) {
        console.log(
          `   Could not retrieve existing hotel: ${getError.message}`
        );
      }
      return null;
    }

    console.log(
      `✗ Failed to create hotel ${hotelData.name}:`,
      error.response?.data?.message || error.response?.data || error.message
    );
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
    return null;
  }
}

async function createRoom(roomData, hotelId) {
  try {
    console.log(`Creating room: ${roomData.roomNumber} for hotel ${hotelId}`);
    const response = await axios.post(
      `${ROOM_SERVICE_URL}/api/init/hotels/${hotelId}/rooms`,
      roomData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    console.log(`✓ Created room: ${roomData.roomNumber}`);
    return response.data;
  } catch (error) {
    // Check if it's a duplicate room number error
    if (
      error.response?.status === 400 &&
      (error.response?.data?.message?.includes("duplicate") ||
        error.response?.data?.message?.includes("E11000") ||
        error.response?.data?.code === 11000)
    ) {
      console.log(
        `⚠ Room "${roomData.roomNumber}" already exists in hotel ${hotelId}, skipping...`
      );
      return null;
    }

    console.log(
      `✗ Failed to create room ${roomData.roomNumber}:`,
      error.response?.data?.message || error.response?.data || error.message
    );
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
    return null;
  }
}

async function createTestData() {
  console.log("Creating test data...\n");

  // Create users
  console.log("Creating test users...");
  const createdUsers = [];
  for (const user of testUsers) {
    const result = await createUser(user);
    if (result) {
      createdUsers.push(result);
    }
  }

  // Create hotels
  console.log("\nCreating test hotels...");
  const createdHotels = [];
  for (const hotel of testHotels) {
    const result = await createHotel(hotel);
    if (result) {
      createdHotels.push(result);
    }
  }

  // Create rooms for each hotel
  console.log("\nCreating test rooms...");
  for (let i = 0; i < createdHotels.length && i < testRooms.length; i++) {
    const hotel = createdHotels[i];
    const hotelId = hotel.hotel?._id || hotel._id || hotel.id;
    console.log(
      `Using hotel ID: ${hotelId} for hotel: ${hotel.hotel?.name || hotel.name}`
    );

    const rooms = testRooms.slice(i * 3, (i + 1) * 3); // 3 rooms per hotel

    for (const room of rooms) {
      await createRoom(room, hotelId);
    }
  }

  console.log("\n✅ Test data creation completed!");
  console.log("\nYou can now:");
  console.log("1. Login with: john@example.com / password123");
  console.log("2. Login with: jane@example.com / password123");
  console.log("3. Browse hotels and make bookings");
}

// Check if services are running
async function checkServices() {
  const services = [
    { name: "User Service", url: `${USER_SERVICE_URL}/health` },
    { name: "Hotel Service", url: `${HOTEL_SERVICE_URL}/health` },
    { name: "Room Service", url: `${ROOM_SERVICE_URL}/health` },
    { name: "Booking Service", url: `${BOOKING_SERVICE_URL}/health` },
  ];

  console.log("Checking service health...\n");

  for (const service of services) {
    try {
      await axios.get(service.url, { timeout: 5000 });
      console.log(`✓ ${service.name} is running`);
    } catch (error) {
      console.log(`✗ ${service.name} is not responding`);
      console.log(`  Make sure the service is running on ${service.url}`);
    }
  }
  console.log("");
}

// Main execution
async function main() {
  await checkServices();
  await createTestData();
}

if (require.main === module) {
  main();
}

module.exports = { createTestData, checkServices };
