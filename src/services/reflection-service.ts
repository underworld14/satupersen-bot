import type { PrismaClient, Reflection } from "@prisma/client";
import {
  generateContent,
  generateReflectionPrompt,
} from "../utils/ai-client.js";

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
   * Create a new reflection with AI analysis
   */
  async createReflection(
    userId: string,
    input: string
  ): Promise<{ reflection: Reflection; aiSummary: string }> {
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

      // Generate AI prompt and get response
      const prompt = generateReflectionPrompt({
        hari_ini: sanitizedInput,
        kemarin,
        dua_hari_lalu: duaHariLalu,
      });

      console.log("🤖 Generating AI analysis...");
      const aiSummary = await generateContent(prompt);

      // Save reflection to database
      const reflection = await this.db.reflection.create({
        data: {
          userId,
          input: sanitizedInput,
          aiSummary,
          date: new Date(),
          wordCount: sanitizedInput.split(" ").length,
        },
      });

      console.log(`✅ Created reflection ${reflection.id} for user ${userId}`);
      return { reflection, aiSummary };
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
  }> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const reflections = await this.getReflectionsInRange(
        userId,
        oneWeekAgo,
        new Date()
      );

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
