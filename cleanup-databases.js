const { MongoClient } = require("mongodb");

// MongoDB connection URL
const MONGODB_URL = "mongodb://localhost:27017";

// Database names used by each service
const databases = [
  "userdb",
  "hoteldb",
  "roomdb",
  "bookingdb",
  "paymentdb",
  "notificationdb",
];

async function deleteAllDatabases() {
  const client = new MongoClient(MONGODB_URL);

  try {
    console.log("🗑️  Connecting to MongoDB...");
    await client.connect();

    console.log("📋 Listing existing databases...");
    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();

    console.log(
      "Available databases:",
      dbList.databases.map((db) => db.name)
    );

    // Delete each service database
    for (const dbName of databases) {
      try {
        const db = client.db(dbName);
        await db.dropDatabase();
        console.log(`✅ Deleted database: ${dbName}`);
      } catch (error) {
        if (error.message.includes("does not exist")) {
          console.log(`ℹ️  Database ${dbName} doesn't exist, skipping...`);
        } else {
          console.error(`❌ Error deleting ${dbName}:`, error.message);
        }
      }
    }

    console.log("\n🎉 All databases cleaned successfully!");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    console.log("\nMake sure MongoDB is running on localhost:27017");
  } finally {
    await client.close();
  }
}

async function main() {
  console.log("🚀 Hotel Booking System - Database Cleanup");
  console.log("==========================================");

  await deleteAllDatabases();

  console.log("\n📝 Next steps:");
  console.log("1. Start all services: bash start-all-services.sh");
  console.log("2. Run test data: node test-data.js");
  console.log("3. Create admin user: node create-admin.js");
}

main().catch(console.error);
