import { Context } from "telegraf";
import { PrismaClient } from "@prisma/client";
import type { User, Reflection } from "@prisma/client";
import type { ReflectionService } from "../services/reflection-service.js";
import type { AnalyticsService } from "../services/analytics-service.js";
import type { StreakService } from "../services/streak-service.js";
import type { MilestoneService } from "../services/milestone-service.js";
import type { HabitAnalysisService } from "../services/habit-analysis-service.js";
import type { ProgressService } from "../services/progress-service.js";
import type { EnhancedAIService } from "../services/enhanced-ai-service.js";

/**
 * Extended Telegram context with custom properties
 */
export interface BotContext extends Context {
  db: PrismaClient;
  user?: User;
  reflectionService: ReflectionService;
  analyticsService: AnalyticsService;
  streakService: StreakService;
  milestoneService: MilestoneService;
  habitAnalysisService: HabitAnalysisService;
  progressService: ProgressService;
  enhancedAIService: EnhancedAIService;
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

/**
 * Type for statistics period selection
 */
export type StatsPeriod = "weekly" | "monthly";

/**
 * Streak data interface
 */
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActive?: Date;
  streakMaintained: boolean;
}

/**
 * Milestone types and data
 */
export type MilestoneType = "3d" | "7d" | "21d" | "66d";

export interface MilestoneData {
  type: MilestoneType;
  achieved: boolean;
  achievedAt?: Date;
  daysToGo?: number;
  title: string;
  description: string;
  badge: string;
}

/**
 * Habit stacking suggestion interface
 */
export interface HabitStackingSuggestion {
  id: string;
  anchorHabit: string;
  newHabit: string;
  suggestion: string;
  confidence: number;
  category: string;
}

/**
 * Progress data interface
 */
export interface ProgressData {
  cumulativeProgress: number; // 1% better calculation
  habitMaturityScore: number; // X/66 days
  weeklyImprovement: number;
  monthlyImprovement: number;
  trendDirection: "up" | "down" | "stable";
}

/**
 * Habit preference categories
 */
export type HabitCategory =
  | "morning_routine"
  | "fitness"
  | "productivity"
  | "mindfulness"
  | "learning"
  | "social"
  | "nutrition"
  | "sleep";
