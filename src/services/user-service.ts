import { db } from "../utils/database.js";
import type { User } from "@prisma/client";
import type { UserRegistrationData } from "../types/bot-context.js";

/**
 * Get an existing user by Telegram ID
 */
export async function getUserByTelegramId(
  telegramId: string
): Promise<User | null> {
  try {
    return await db.user.findUnique({
      where: {
        telegramId: telegramId,
      },
    });
  } catch (error) {
    console.error("Error fetching user by Telegram ID:", error);
    throw error;
  }
}

/**
 * Create a new user in the database
 */
export async function createUser(
  userData: UserRegistrationData
): Promise<User> {
  try {
    return await db.user.create({
      data: {
        telegramId: userData.telegramId,
        username: userData.username,
        firstName: userData.firstName,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

/**
 * Update existing user information
 */
export async function updateUser(
  userId: string,
  userData: Partial<UserRegistrationData>
): Promise<User> {
  try {
    return await db.user.update({
      where: {
        id: userId,
      },
      data: {
        username: userData.username,
        firstName: userData.firstName,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

/**
 * Get or create user - main function for user authentication
 * If user doesn't exist, creates a new one
 * If user exists but has updated info, updates the record
 */
export async function getOrCreateUser(
  userData: UserRegistrationData
): Promise<User> {
  try {
    // Try to find existing user
    let user = await getUserByTelegramId(userData.telegramId);

    if (user) {
      // Check if user info needs updating
      if (
        user.username !== userData.username ||
        user.firstName !== userData.firstName
      ) {
        console.log(`🔄 Updating user info for ${userData.telegramId}`);
        user = await updateUser(user.id, userData);
      }
      return user;
    }

    // Create new user if doesn't exist
    console.log(`➕ Creating new user: ${userData.telegramId}`);
    return await createUser(userData);
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    throw error;
  }
}

/**
 * Validate user registration data
 */
export function validateUserData(
  userData: Partial<UserRegistrationData>
): boolean {
  if (!userData.telegramId) {
    return false;
  }

  // Telegram ID should be a valid number string
  if (!/^\d+$/.test(userData.telegramId)) {
    return false;
  }

  return true;
}
