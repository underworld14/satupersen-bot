import type { PrismaClient, Reflection } from "@prisma/client";
import type { StatsPeriod } from "../types/bot-context.js"; // Added import
import {
  generateContent,
  generateReflectionPrompt,
} from "../utils/ai-client.js";
import {
  generateHabitAwareReflectionPrompt,
  generateMilestoneCelebrationPrompt,
  generateStreakRecoveryPrompt,
  type HabitAwarePromptData,
} from "../utils/ai-prompt-templates.js";

/**
 * Reflection Service - handles all reflection-related operations
 */
export class ReflectionService {
  constructor(private db: PrismaClient) {}

  /**
   * Get the last N reflections for a user, ordered by date (newest first)
   */
  async getLastReflections(
    userId: string,
    count: number = 2
  ): Promise<Reflection[]> {
    try {
      const reflections = await this.db.reflection.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: count,
      });

      console.log(
        `📊 Retrieved ${reflections.length} reflections for user ${userId}`
      );
      return reflections;
    } catch (error) {
      console.error("❌ Error fetching reflections:", error);
      throw new Error("Failed to retrieve previous reflections");
    }
  }

  /**
   * Get concatenated text of all reflections for a user within a given period.
   */
  async getReflectionsTextForPeriod(
    userId: string,
    period: StatsPeriod
  ): Promise<string> {
    try {
      const days = period === "weekly" ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const reflections = await this.getReflectionsInRange(
        userId,
        startDate,
        new Date()
      );

      if (reflections.length === 0) {
        return "";
      }

      // Concatenate all reflection inputs, separated by a clear marker for the AI.
      const combinedText = reflections.map((r) => r.input).join("\n\n---\n\n"); // Using "---" as a separator between reflections

      console.log(
        `📝 Combined text of ${reflections.length} reflections for user ${userId} for ${period} period.`
      );
      return combinedText;
    } catch (error) {
      console.error(
        `❌ Error fetching reflection texts for period ${period}:`,
        error
      );
      throw new Error(
        `Failed to retrieve reflection texts for the ${period} period`
      );
    }
  }

  /**
   * Get monthly statistics (last 30 days)
   */
  async getMonthlyStats(userId: string): Promise<{
    totalDays: number;
    reflectionCount: number;
    averageWordsPerDay: number;
    mostActiveDay: string;
    averageMoodScore: number | null;
    moodScoreTrend: string;
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const reflections = await this.getReflectionsInRange(
        userId,
        thirtyDaysAgo,
        new Date()
      );

      // MoodScore calculations
      const reflectionsWithMoodScore = reflections.filter(
        (r) => r.moodScore !== null && r.moodScore >= 1 && r.moodScore <= 100
      );
      let averageMoodScore: number | null = null;
      let moodScoreTrend = "N/A";

      if (reflectionsWithMoodScore.length > 0) {
        const sumMoodScore = reflectionsWithMoodScore.reduce(
          (sum, r) => sum + (r.moodScore ?? 0), // Nullish coalescing for safety
          0
        );
        averageMoodScore = Math.round(
          sumMoodScore / reflectionsWithMoodScore.length
        );

        // Trend calculation: Compare average of first half of reflections with moodscore vs second half.
        // Reflections are ordered desc by date from getReflectionsInRange, so reverse for chronological trend.
        const sortedReflections = [...reflectionsWithMoodScore].reverse();

        // For monthly, require more data points for a meaningful trend than weekly.
        if (sortedReflections.length >= 4) {
          const midPoint = Math.ceil(sortedReflections.length / 2);
          const firstHalfScores = sortedReflections
            .slice(0, midPoint)
            .map((r) => r.moodScore ?? 0);
          const secondHalfScores = sortedReflections
            .slice(midPoint)
            .map((r) => r.moodScore ?? 0);

          if (firstHalfScores.length > 0 && secondHalfScores.length > 0) {
            const avgFirstHalf =
              firstHalfScores.reduce((a, b) => a + b, 0) /
              firstHalfScores.length;
            const avgSecondHalf =
              secondHalfScores.reduce((a, b) => a + b, 0) /
              secondHalfScores.length;

            if (avgSecondHalf > avgFirstHalf) {
              moodScoreTrend = "Meningkat";
            } else if (avgSecondHalf < avgFirstHalf) {
              moodScoreTrend = "Menurun";
            } else {
              moodScoreTrend = "Stabil";
            }
          } else if (sortedReflections.length >= 1) {
            // Should not happen if length >=4 and midPoint logic is correct
            moodScoreTrend = "Stabil";
          }
        } else if (sortedReflections.length >= 1) {
          // Not enough data for trend, but has an average
          moodScoreTrend = "Stabil";
        }
      }

      const totalWords = reflections.reduce((sum, r) => sum + r.wordCount, 0);
      const averageWords =
        reflections.length > 0
          ? Math.round(totalWords / reflections.length)
          : 0;

      // Find most active day
      const dayCount: Record<string, number> = {};
      reflections.forEach((r) => {
        const day = r.date.toLocaleDateString("id-ID", { weekday: "long" });
        dayCount[day] = (dayCount[day] || 0) + 1;
      });

      const mostActiveDay =
        Object.entries(dayCount).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        "Belum ada data";

      return {
        totalDays: 30,
        reflectionCount: reflections.length,
        averageWordsPerDay: averageWords,
        mostActiveDay,
        averageMoodScore,
        moodScoreTrend,
      };
    } catch (error) {
      console.error("❌ Error generating monthly stats:", error);
      throw new Error("Failed to generate monthly statistics");
    }
  }

  /**
   * Get today's reflection for a user
   */
  async getTodayReflection(userId: string): Promise<Reflection | null> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const reflection = await this.db.reflection.findFirst({
        where: {
          userId,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
        orderBy: { date: "desc" },
      });

      console.log(
        `📅 Today's reflection for user ${userId}: ${
          reflection ? "Found" : "Not found"
        }`
      );
      return reflection;
    } catch (error) {
      console.error("❌ Error fetching today's reflection:", error);
      throw new Error("Failed to retrieve today's reflection");
    }
  }

  /**
   * Create a new reflection with enhanced habit-aware AI analysis
   */
  async createReflection(
    userId: string,
    input: string,
    streakService?: import("./streak-service.js").StreakService,
    milestoneService?: import("./milestone-service.js").MilestoneService,
    habitAnalysisService?: import("./habit-analysis-service.js").HabitAnalysisService,
    progressService?: import("./progress-service.js").ProgressService
  ): Promise<{
    reflection: Reflection;
    aiSummary: string;
    newMilestones?: import("../types/bot-context.js").MilestoneData[];
    habitSuggestion?: string;
  }> {
    try {
      // Input validation
      if (!input || input.trim().length < 10) {
        throw new Error(
          "Refleksi terlalu pendek. Mohon tulis minimal 10 karakter untuk analisis yang baik."
        );
      }

      if (input.length > 2000) {
        throw new Error(
          "Refleksi terlalu panjang. Mohon batasi maksimal 2000 karakter."
        );
      }

      // Sanitize input
      const sanitizedInput = this.sanitizeInput(input);

      // Get previous reflections for context
      const previousReflections = await this.getLastReflections(userId, 2);
      const kemarin = previousReflections[0]?.input || null;
      const duaHariLalu = previousReflections[1]?.input || null;

      // Gather habit psychology context for enhanced AI analysis
      let habitContext: Partial<HabitAwarePromptData> = {
        hari_ini: sanitizedInput,
        kemarin,
        dua_hari_lalu: duaHariLalu,
      };

      // Get streak data if service is available
      if (streakService) {
        try {
          habitContext.streakData = await streakService.getStreakData(userId);
        } catch (error) {
          console.warn("⚠️ Failed to get streak data for AI context:", error);
        }
      }

      // Get habit patterns if service is available
      if (habitAnalysisService) {
        try {
          const habitAnalysis = await habitAnalysisService.analyzeHabitPatterns(
            userId,
            7
          );
          habitContext.habitPatterns = habitAnalysis.identifiedHabits;
        } catch (error) {
          console.warn(
            "⚠️ Failed to get habit patterns for AI context:",
            error
          );
        }
      }

      // Get progress data if service is available
      if (progressService) {
        try {
          const progressData = await progressService.getProgressData(userId);
          const insights = await progressService.getProgressInsights(userId);
          habitContext.progressLevel = insights.achievementLevel;
          habitContext.cumulativeProgress = progressData.cumulativeProgress;
          habitContext.habitMaturity = progressData.habitMaturityScore;
        } catch (error) {
          console.warn("⚠️ Failed to get progress data for AI context:", error);
        }
      }

      // Get recent milestones if service is available
      if (milestoneService) {
        try {
          const userMilestones = await milestoneService.getUserMilestones(
            userId
          );
          // Get recent achieved milestones (last 7 days)
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          habitContext.recentMilestones = userMilestones.filter(
            (m) => m.achieved && m.achievedAt && m.achievedAt >= weekAgo
          );
        } catch (error) {
          console.warn(
            "⚠️ Failed to get milestone data for AI context:",
            error
          );
        }
      }

      // Get mood trend from recent stats
      try {
        const weeklyStats = await this.getWeeklyStats(userId);
        habitContext.avgMoodScore = weeklyStats.averageMoodScore || undefined;
        habitContext.moodTrend = weeklyStats.moodScoreTrend;
      } catch (error) {
        console.warn("⚠️ Failed to get mood stats for AI context:", error);
      }

      // Generate enhanced habit-aware AI prompt
      let prompt: string;
      if (Object.keys(habitContext).length > 3) {
        // More than just the basic reflection data
        prompt = generateHabitAwareReflectionPrompt(
          habitContext as HabitAwarePromptData
        );
        console.log("🧠 Using enhanced habit-aware AI prompt");
      } else {
        // Fallback to traditional prompt if no habit context available
        prompt = generateReflectionPrompt({
          hari_ini: sanitizedInput,
          kemarin,
          dua_hari_lalu: duaHariLalu,
        });
        console.log("🤖 Using traditional AI prompt (no habit context)");
      }

      console.log("🤖 Generating AI analysis...");
      let aiResponseText = await generateContent(prompt);

      let moodScore: number | null = null;
      const moodScoreRegex = /moodScore:\s*(\d+)/i;
      const match = aiResponseText.match(moodScoreRegex);

      if (match && match[1]) {
        const score = parseInt(match[1], 10);
        if (score >= 1 && score <= 100) {
          moodScore = score;
          console.log(`😊 Extracted moodScore: ${moodScore}`);
        } else {
          console.warn(
            `⚠️ Invalid moodScore extracted: ${match[1]}. Storing as null.`
          );
        }
        // Remove the moodScore line from the AI summary to be shown to the user
        aiResponseText = aiResponseText.replace(moodScoreRegex, "").trim();
      } else {
        console.warn("⚠️ moodScore not found in AI response.");
      }

      // Update user's streak if streak service is provided
      let currentStreakDay = 0;
      let newMilestones: import("../types/bot-context.js").MilestoneData[] = [];

      if (streakService) {
        try {
          const streakData = await streakService.updateStreak(userId);
          currentStreakDay = streakData.currentStreak;
          console.log(
            `🔥 Updated streak to ${currentStreakDay} for user ${userId}`
          );

          // Check for new milestones if milestone service is provided
          if (milestoneService) {
            try {
              newMilestones = await milestoneService.checkAndUnlockMilestones(
                userId,
                currentStreakDay
              );
              if (newMilestones.length > 0) {
                console.log(
                  `🏆 Unlocked ${newMilestones.length} milestone(s) for user ${userId}`
                );
              }
            } catch (error) {
              console.warn("⚠️ Failed to check milestones:", error);
              // Continue without failing the reflection creation
            }
          }
        } catch (error) {
          console.warn("⚠️ Failed to update streak:", error);
          // Continue without failing the reflection creation
        }
      }

      // Generate habit stacking suggestion if available
      let habitSuggestion: string | undefined;
      if (
        habitAnalysisService &&
        habitContext.habitPatterns &&
        habitContext.habitPatterns.length > 0
      ) {
        try {
          const suggestions =
            await habitAnalysisService.generateHabitStackingSuggestions(
              userId,
              habitContext.habitPatterns,
              [], // anchorHabits
              [] // categories
            );
          if (suggestions.length > 0 && suggestions[0]) {
            habitSuggestion = suggestions[0].suggestion;
          }
        } catch (error) {
          console.warn("⚠️ Failed to generate habit suggestion:", error);
        }
      }

      // Save reflection to database
      const reflection = await this.db.reflection.create({
        data: {
          userId,
          input: sanitizedInput,
          aiSummary: aiResponseText, // Store the cleaned summary
          moodScore, // Store the extracted moodScore
          date: new Date(),
          wordCount: sanitizedInput.split(" ").length,
          streakDay: currentStreakDay,
          habitStackingSuggestion: habitSuggestion,
        },
      });

      console.log(`✅ Created reflection ${reflection.id} for user ${userId}`);
      return {
        reflection,
        aiSummary: aiResponseText,
        newMilestones: newMilestones.length > 0 ? newMilestones : undefined,
        habitSuggestion,
      };
    } catch (error) {
      console.error("❌ Error creating reflection:", error);

      if (
        error instanceof Error &&
        error.message.includes("Refleksi terlalu")
      ) {
        throw error; // Re-throw validation errors as-is
      }

      throw new Error(
        "Maaf, terjadi kesalahan saat memproses refleksi Anda. Silakan coba lagi."
      );
    }
  }

  /**
   * Get reflections for a date range (for statistics)
   */
  async getReflectionsInRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Reflection[]> {
    try {
      const reflections = await this.db.reflection.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: "desc" },
      });

      console.log(
        `📊 Retrieved ${reflections.length} reflections for user ${userId} in date range`
      );
      return reflections;
    } catch (error) {
      console.error("❌ Error fetching reflections in range:", error);
      throw new Error(
        "Failed to retrieve reflections for the specified period"
      );
    }
  }

  /**
   * Get weekly statistics (last 7 days)
   */
  async getWeeklyStats(userId: string): Promise<{
    totalDays: number;
    reflectionCount: number;
    averageWordsPerDay: number;
    mostActiveDay: string;
    averageMoodScore: number | null;
    moodScoreTrend: string;
  }> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const reflections = await this.getReflectionsInRange(
        userId,
        oneWeekAgo,
        new Date()
      );

      // MoodScore calculations
      const reflectionsWithMoodScore = reflections.filter(
        (r) => r.moodScore !== null && r.moodScore >= 1 && r.moodScore <= 100
      );
      let averageMoodScore: number | null = null;
      let moodScoreTrend = "N/A";

      if (reflectionsWithMoodScore.length > 0) {
        const sumMoodScore = reflectionsWithMoodScore.reduce(
          (sum, r) => sum + (r.moodScore ?? 0), // Nullish coalescing for safety, though filter should prevent nulls
          0
        );
        averageMoodScore = Math.round(
          sumMoodScore / reflectionsWithMoodScore.length
        );

        // Trend calculation: Compare average of first half of reflections with moodscore vs second half.
        // Reflections are ordered desc by date from getReflectionsInRange, so reverse for chronological trend.
        const sortedReflections = [...reflectionsWithMoodScore].reverse();

        if (sortedReflections.length >= 2) {
          const midPoint = Math.ceil(sortedReflections.length / 2);
          const firstHalfScores = sortedReflections
            .slice(0, midPoint)
            .map((r) => r.moodScore ?? 0);
          const secondHalfScores = sortedReflections
            .slice(midPoint)
            .map((r) => r.moodScore ?? 0);

          if (firstHalfScores.length > 0 && secondHalfScores.length > 0) {
            const avgFirstHalf =
              firstHalfScores.reduce((a, b) => a + b, 0) /
              firstHalfScores.length;
            const avgSecondHalf =
              secondHalfScores.reduce((a, b) => a + b, 0) /
              secondHalfScores.length;

            if (avgSecondHalf > avgFirstHalf) {
              moodScoreTrend = "Meningkat";
            } else if (avgSecondHalf < avgFirstHalf) {
              moodScoreTrend = "Menurun";
            } else {
              moodScoreTrend = "Stabil";
            }
          } else if (sortedReflections.length >= 1) {
            // If only one half has data (e.g. 1 score in first, 0 in second due to ceil)
            moodScoreTrend = "Stabil";
          }
        } else if (sortedReflections.length === 1) {
          moodScoreTrend = "Stabil"; // Only one data point
        }
      }

      const totalWords = reflections.reduce((sum, r) => sum + r.wordCount, 0);
      const averageWords =
        reflections.length > 0
          ? Math.round(totalWords / reflections.length)
          : 0;

      // Find most active day
      const dayCount: Record<string, number> = {};
      reflections.forEach((r) => {
        const day = r.date.toLocaleDateString("id-ID", { weekday: "long" });
        dayCount[day] = (dayCount[day] || 0) + 1;
      });

      const mostActiveDay =
        Object.entries(dayCount).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        "Belum ada data";

      return {
        totalDays: 7,
        reflectionCount: reflections.length,
        averageWordsPerDay: averageWords,
        mostActiveDay,
        averageMoodScore,
        moodScoreTrend,
      };
    } catch (error) {
      console.error("❌ Error generating weekly stats:", error);
      throw new Error("Failed to generate weekly statistics");
    }
  }

  /**
   * Sanitize user input to prevent potential issues
   */
  private sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .slice(0, 2000); // Ensure max length
  }

  /**
   * Check if user has reflected today
   */
  async hasReflectedToday(userId: string): Promise<boolean> {
    const todayReflection = await this.getTodayReflection(userId);
    return todayReflection !== null;
  }
}
