import { config } from "dotenv";

config();

interface EnvironmentVariables {
  BOT_TOKEN: string;
  GOOGLE_AI_MODEL_NAME: string;
  GOOGLE_API_KEY: string;
  DATABASE_URL: string;
  NODE_ENV?: string;
}

/**
 * Validates that all required environment variables are present
 * @throws Error if any required environment variable is missing
 */
export function validateEnvironment(): EnvironmentVariables {
  const requiredVars = [
    "BOT_TOKEN",
    "GOOGLE_AI_MODEL_NAME",
    "GOOGLE_API_KEY",
    "DATABASE_URL",
  ];

  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}\n` +
        "Please check your .env file and ensure all required variables are set."
    );
  }

  return {
    BOT_TOKEN: process.env.BOT_TOKEN!,
    GOOGLE_AI_MODEL_NAME: process.env.GOOGLE_AI_MODEL_NAME!,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY!,
    DATABASE_URL: process.env.DATABASE_URL!,
    NODE_ENV: process.env.NODE_ENV || "development",
  };
}

/**
 * Gets validated environment variables
 */
export const env = validateEnvironment();
