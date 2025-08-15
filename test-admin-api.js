const axios = require("axios");

async function testAdminHotelCreation() {
  try {
    console.log("🔑 Logging in as admin...");

    // First, login as admin
    const loginResponse = await axios.post(
      "http://localhost:3001/api/users/login",
      {
        email: "admin@hotelBooking.com",
        password: "admin123",
      }
    );

    const token = loginResponse.data.token;
    console.log("✅ Admin login successful!");
    console.log("🎫 Token:", token.substring(0, 50) + "...");

    // Now test hotel creation
    console.log("\n🏨 Testing hotel creation...");

    const hotelData = {
      name: "Test Hotel from API",
      description: "A test hotel created via API",
      address: {
        street: "123 Test Street",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        zipCode: "12345",
      },
      contact: {
        phone: "1234567890",
        email: "test@hotel.com",
      },
      amenities: ["WiFi", "Pool", "Gym"],
      images: ["https://example.com/image1.jpg"],
      totalRooms: 10,
    };

    const hotelResponse = await axios.post(
      "http://localhost:3002/api/hotels",
      hotelData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Hotel created successfully!");
    console.log("🏨 Hotel ID:", hotelResponse.data.hotel._id);
    console.log("📝 Hotel Name:", hotelResponse.data.hotel.name);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log(
        "🔐 This is an authentication error - token might be invalid"
      );
    }
  }
}

testAdminHotelCreation();
