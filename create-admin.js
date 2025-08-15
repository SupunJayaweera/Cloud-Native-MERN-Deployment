const axios = require("axios");

async function createAdminUser() {
  try {
    console.log("🚀 Creating admin user...");

    const adminData = {
      username: "admin",
      email: "admin@hotelBooking.com",
      password: "admin123",
      firstName: "System",
      lastName: "Administrator",
      phone: "+1-555-ADMIN",
    };

    const response = await axios.post(
      "http://localhost:3001/api/users/register",
      adminData
    );

    console.log("✅ Admin user created successfully!");
    console.log("📧 Email: admin@hotelBooking.com");
    console.log("🔐 Password: admin123");
    console.log(
      "\nYou can now login with these credentials in the frontend application."
    );
  } catch (error) {
    if (
      error.response?.status === 400 &&
      error.response?.data?.error === "User already exists"
    ) {
      console.log("ℹ️  Admin user already exists!");
      console.log("📧 Email: admin@hotelBooking.com");
      console.log("🔐 Password: admin123");
      console.log(
        "\nYou can login with these credentials in the frontend application."
      );
    } else {
      console.error(
        "❌ Error creating admin user:",
        error.response?.data || error.message
      );
    }
  }
}

// Test login
async function testLogin() {
  try {
    console.log("\n🔄 Testing login...");

    const loginResponse = await axios.post(
      "http://localhost:3001/api/users/login",
      {
        email: "admin@hotelBooking.com",
        password: "admin123",
      }
    );

    console.log("✅ Login successful!");
    console.log(
      "👤 User:",
      loginResponse.data.user.firstName,
      loginResponse.data.user.lastName
    );
    console.log("🎫 Token created successfully");
  } catch (error) {
    console.error("❌ Login failed:", error.response?.data || error.message);
  }
}

async function main() {
  console.log("🏨 Hotel Booking System - Admin Setup");
  console.log("====================================");

  await createAdminUser();
  await testLogin();

  console.log("\n📋 Admin Login Information:");
  console.log("Email: admin@hotelBooking.com");
  console.log("Password: admin123");
  console.log("\nTo login as admin:");
  console.log("1. Go to the frontend application");
  console.log("2. Use the above credentials to login");
  console.log("3. You will have admin access to the system");
}

main().catch(console.error);
