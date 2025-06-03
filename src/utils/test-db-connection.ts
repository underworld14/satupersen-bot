import { database } from "./database.js";

/**
 * Test database connection
 */
async function testDatabaseConnection(): Promise<void> {
  try {
    console.log("🔍 Testing database connection...");

    await database.connect();

    const isConnected = await database.testConnection();

    if (isConnected) {
      console.log("✅ Database connection test passed!");
    } else {
      console.log("❌ Database connection test failed!");
    }

    await database.disconnect();
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (import.meta.main) {
  testDatabaseConnection();
}
