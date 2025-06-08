import { Context } from "telegraf";
import { PrismaClient } from "@prisma/client";
import type { User, Reflection } from "@prisma/client";
import type { ReflectionService } from "../services/reflection-service.js";

/**
 * Extended Telegram context with custom properties
 */
export interface BotContext extends Context {
  db: PrismaClient;
  user?: User;
  reflectionService: ReflectionService;
}

/**
 * Reflection data transfer object
 */
export interface ReflectionDTO {
  id: string;
  userId: string;
  date: Date;
  input: string;
  aiSummary?: string;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User registration data
 */
export interface UserRegistrationData {
  telegramId: string;
  username?: string;
  firstName?: string;
}

/**
 * AI reflection prompt data
 */
export interface ReflectionPromptData {
  today: string;
  yesterday?: string;
  twoDaysAgo?: string;
}

/**
 * Statistics response data
 */
export interface StatsData {
  totalReflections: number;
  daysRecorded: number;
  totalDays: number;
  averageWordCount: number;
  mostActiveDay?: string;
  reflectionStreak: number;
}
