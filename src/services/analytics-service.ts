import type { PrismaClient, Reflection } from "@prisma/client";
import type { StatsPeriod } from "../types/bot-context.js"; // Assuming StatsPeriod is useful here
// import { generateContent, generateInsightPrompt } from "../utils/ai-client.js"; // For future AI insights

/**
 * AnalyticsService - handles advanced analytics, trends, KPIs, and insights.
 */
export class AnalyticsService {
  constructor(private db: PrismaClient) {}

  /**
   * Counts the total number of reflections for a user.
   */
  async getTotalReflectionCount(userId: string): Promise<number> {
    try {
      const count = await this.db.reflection.count({
        where: { userId },
      });
      console.log(`📊 Total reflections for user ${userId}: ${count}`);
      return count;
    } catch (error) {
      console.error(`❌ Error fetching total reflection count for user ${userId}:`, error);
      throw new Error("Failed to retrieve total reflection count.");
    }
  }

  /**
   * Counts reflections for a user within a specific date range.
   */
  async getReflectionCountForPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const count = await this.db.reflection.count({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      console.log(
        `📊 Reflections for user ${userId} between ${startDate.toISOString()} and ${endDate.toISOString()}: ${count}`
      );
      return count;
    } catch (error) {
      console.error(`❌ Error fetching reflection count for period for user ${userId}:`, error);
      throw new Error("Failed to retrieve reflection count for the period.");
    }
  }

  /**
   * Analyzes reflection frequency over time (Placeholder).
   * This could involve comparing counts from different periods.
   */
  async getReflectionFrequencyTrend(
    userId: string,
    period: StatsPeriod = "monthly" // Default to monthly, or could take specific date ranges
  ): Promise<string> {
    console.log(`📈 Analyzing reflection frequency trend for user ${userId} over ${period} period.`);
    // Placeholder logic:
    // const currentPeriodEndDate = new Date();
    // const currentPeriodStartDate = new Date();
    // currentPeriodStartDate.setDate(currentPeriodEndDate.getDate() - (period === "weekly" ? 7 : 30));
    //
    // const previousPeriodEndDate = new Date(currentPeriodStartDate);
    // previousPeriodEndDate.setDate(previousPeriodEndDate.getDate() -1);
    // const previousPeriodStartDate = new Date(previousPeriodEndDate);
    // previousPeriodStartDate.setDate(previousPeriodEndDate.getDate() - (period === "weekly" ? 7 : 30));
    //
    // const currentCount = await this.getReflectionCountForPeriod(userId, currentPeriodStartDate, currentPeriodEndDate);
    // const previousCount = await this.getReflectionCountForPeriod(userId, previousPeriodStartDate, previousPeriodEndDate);
    //
    // if (currentCount > previousCount) return "Meningkat";
    // if (currentCount < previousCount) return "Menurun";
    // if (currentCount === previousCount && currentCount > 0) return "Stabil";
    // return "Belum ada data yang cukup untuk tren";
    return "Analisis tren frekuensi refleksi belum diimplementasikan sepenuhnya.";
  }

  /**
   * Calculates Key Performance Indicators (KPIs) related to reflection habits (Placeholder).
   */
  async calculateReflectionKPIs(
    userId: string,
    period: StatsPeriod = "monthly"
  ): Promise<{
    totalDays: number;
    reflectionCount: number;
    consistencyPercentage: number;
    averageWordsPerDay: number;
    mostActiveDay: string;
    averageMoodScore: number | null;
    moodScoreTrend: string;
    status: string;
  }> {
    console.log(`📊 Calculating reflection KPIs for user ${userId} over ${period} period.`);
    const days = period === "weekly" ? 7 : 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const reflections = await this.db.reflection.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        orderBy: { date: "desc" }, // Keep it desc to match ReflectionService for now, reverse later if needed for trend
    });

    const reflectionCount = reflections.length;
    const consistency = (reflectionCount / days) * 100; // Simple consistency
    const totalWords = reflections.reduce((sum, r) => sum + r.wordCount, 0);
    const averageWordCount = reflectionCount > 0 ? totalWords / reflectionCount : 0;

    // Find most active day
    let mostActiveDay = "Belum ada data";
    if (reflectionCount > 0) {
      const dayCount: Record<string, number> = {};
      reflections.forEach((r) => {
        const day = r.date.toLocaleDateString("id-ID", { weekday: "long" });
        dayCount[day] = (dayCount[day] || 0) + 1;
      });
      mostActiveDay =
        Object.entries(dayCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "Belum ada data";
    }

    // MoodScore calculations
    const reflectionsWithMoodScore = reflections.filter(
      (r) => r.moodScore !== null && r.moodScore >= 1 && r.moodScore <= 100
    );
    let averageMoodScore: number | null = null;
    let moodScoreTrend = "N/A";

    if (reflectionsWithMoodScore.length > 0) {
      const sumMoodScore = reflectionsWithMoodScore.reduce(
        (sum, r) => sum + (r.moodScore ?? 0),
        0
      );
      averageMoodScore = Math.round(
        sumMoodScore / reflectionsWithMoodScore.length
      );

      const sortedReflections = [...reflectionsWithMoodScore].reverse(); // reverse to get chronological order

      if (period === "weekly") {
        if (sortedReflections.length >= 2) {
          const midPoint = Math.ceil(sortedReflections.length / 2);
          const firstHalfScores = sortedReflections.slice(0, midPoint).map((r) => r.moodScore ?? 0);
          const secondHalfScores = sortedReflections.slice(midPoint).map((r) => r.moodScore ?? 0);
          if (firstHalfScores.length > 0 && secondHalfScores.length > 0) {
            const avgFirstHalf = firstHalfScores.reduce((a, b) => a + b, 0) / firstHalfScores.length;
            const avgSecondHalf = secondHalfScores.reduce((a, b) => a + b, 0) / secondHalfScores.length;
            if (avgSecondHalf > avgFirstHalf) moodScoreTrend = "Meningkat";
            else if (avgSecondHalf < avgFirstHalf) moodScoreTrend = "Menurun";
            else moodScoreTrend = "Stabil";
          } else if (sortedReflections.length >=1) moodScoreTrend = "Stabil";
        } else if (sortedReflections.length === 1) moodScoreTrend = "Stabil";
      } else { // monthly
        if (sortedReflections.length >= 4) { // Require more data for monthly trend
          const midPoint = Math.ceil(sortedReflections.length / 2);
          const firstHalfScores = sortedReflections.slice(0, midPoint).map((r) => r.moodScore ?? 0);
          const secondHalfScores = sortedReflections.slice(midPoint).map((r) => r.moodScore ?? 0);
          if (firstHalfScores.length > 0 && secondHalfScores.length > 0) {
            const avgFirstHalf = firstHalfScores.reduce((a, b) => a + b, 0) / firstHalfScores.length;
            const avgSecondHalf = secondHalfScores.reduce((a, b) => a + b, 0) / secondHalfScores.length;
            if (avgSecondHalf > avgFirstHalf) moodScoreTrend = "Meningkat";
            else if (avgSecondHalf < avgFirstHalf) moodScoreTrend = "Menurun";
            else moodScoreTrend = "Stabil";
          } else if (sortedReflections.length >=1) moodScoreTrend = "Stabil";
        } else if (sortedReflections.length >= 1) moodScoreTrend = "Stabil";
      }
    }

    return {
      totalDays: days,
      reflectionCount,
      consistencyPercentage: parseFloat(consistency.toFixed(2)),
      averageWordsPerDay: parseFloat(averageWordCount.toFixed(2)),
      mostActiveDay,
      averageMoodScore,
      moodScoreTrend,
      status: "Data KPI dasar. Fitur lanjutan dalam pengembangan.",
    };
  }

  /**
   * Generates personalized insights and recommendations (Placeholder).
   * This could use AI in the future.
   */
  async generatePersonalizedInsights(
    userId: string,
    period: StatsPeriod = "monthly"
  ): Promise<string[]> {
    console.log(`💡 Generating personalized insights for user ${userId} for ${period} period.`);
    // const kpis = await this.calculateReflectionKPIs(userId, period);
    // Basic placeholder insights
    const insights: string[] = [
      "Luangkan waktu beberapa menit setiap hari untuk refleksi diri. Konsistensi adalah kunci.",
      "Cobalah untuk menulis lebih detail tentang perasaan dan pengalamanmu untuk mendapatkan manfaat maksimal.",
    ];

    if (period === "monthly") {
      insights.push(
        "Lihat kembali refleksimu di akhir bulan untuk melihat pola dan pertumbuhanmu."
      );
    }
    // Example of how it might be extended:
    // if (kpis.consistencyPercentage < 50) {
    //   insights.push("Tantang dirimu untuk refleksi minimal 3-4 kali seminggu ini!");
    // }
    // if (kpis.averageWordCount < 50) {
    //   insights.push("Coba tulis lebih dari 50 kata per refleksi untuk menggali lebih dalam.");
    // }

    insights.push("Fitur insight lanjutan dengan AI akan segera hadir!");
    return insights;
  }
}

// Example of how to potentially use this service (e.g. in a command or another service)
/*
async function main() {
  const prisma = new PrismaClient(); // Setup Prisma client
  const analyticsService = new AnalyticsService(prisma);
  const userId = "some-user-id"; // From ctx.user.id

  try {
    const totalReflections = await analyticsService.getTotalReflectionCount(userId);
    console.log(`User ${userId} has ${totalReflections} total reflections.`);

    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    const weeklyCount = await analyticsService.getReflectionCountForPeriod(userId, lastWeek, today);
    console.log(`User ${userId} has ${weeklyCount} reflections in the last week.`);

    const trend = await analyticsService.getReflectionFrequencyTrend(userId, "weekly");
    console.log(`Weekly reflection trend for user ${userId}: ${trend}`);

    const kpis = await analyticsService.calculateReflectionKPIs(userId, "monthly");
    console.log(`Monthly KPIs for user ${userId}:`, kpis);

    const insights = await analyticsService.generatePersonalizedInsights(userId, "monthly");
    console.log(`Insights for user ${userId}:`, insights.join("\n- "));

  } catch (error) {
    console.error("Error in analytics example:", error);
  } finally {
    await prisma.$disconnect();
  }
}
*/
