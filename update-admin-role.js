const { MongoClient } = require("mongodb");

async function updateAdminRole() {
  const client = new MongoClient("mongodb://localhost:27017");

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("user-service");
    const usersCollection = db.collection("users");

    // Update the admin user to have admin role
    const result = await usersCollection.updateOne(
      { email: "admin@hotelBooking.com" },
      { $set: { role: "admin" } }
    );

    if (result.matchedCount > 0) {
      console.log("✅ Admin role updated successfully!");

      // Verify the update
      const user = await usersCollection.findOne({
        email: "admin@hotelBooking.com",
      });
      console.log("✅ User role verified:", user.role);
    } else {
      console.log("❌ Admin user not found");
    }
  } catch (error) {
    console.error("❌ Error updating admin role:", error);
  } finally {
    await client.close();
  }
}

updateAdminRole();
