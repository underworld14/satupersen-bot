import { PrismaClient } from "@prisma/client";
import { env } from "./env-validation.js";

/**
 * Prisma client instance with connection management
 */
class DatabaseConnection {
  private static instance: PrismaClient | null = null;

  /**
   * Gets or creates a Prisma client instance
   */
  public static getInstance(): PrismaClient {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new PrismaClient({
        log:
          env.NODE_ENV === "development"
            ? ["query", "info", "warn", "error"]
            : ["error"],
        errorFormat: "pretty",
      });
    }
    return DatabaseConnection.instance;
  }

  /**
   * Connects to the database and tests the connection
   */
  public static async connect(): Promise<void> {
    try {
      const prisma = DatabaseConnection.getInstance();
      await prisma.$connect();
      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw error;
    }
  }

  /**
   * Disconnects from the database
   */
  public static async disconnect(): Promise<void> {
    if (DatabaseConnection.instance) {
      await DatabaseConnection.instance.$disconnect();
      DatabaseConnection.instance = null;
      console.log("🔌 Database disconnected");
    }
  }

  /**
   * Tests database connection
   */
  public static async testConnection(): Promise<boolean> {
    try {
      const prisma = DatabaseConnection.getInstance();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error("Database connection test failed:", error);
      return false;
    }
  }
}

/**
 * Global Prisma client instance
 */
export const db = DatabaseConnection.getInstance();

/**
 * Database connection utilities
 */
export const database = {
  connect: DatabaseConnection.connect,
  disconnect: DatabaseConnection.disconnect,
  testConnection: DatabaseConnection.testConnection,
};
