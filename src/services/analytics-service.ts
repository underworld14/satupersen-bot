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
  ): Promise<Record<string, any>> {
    console.log(`📊 Calculating reflection KPIs for user ${userId} over ${period} period.`);
    const days = period === "weekly" ? 7 : 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const reflections = await this.db.reflection.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        orderBy: { date: "asc" },
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

    // Placeholder for more advanced KPIs
    return {
      totalDays: days, // Renamed from 'period' for clarity and compatibility
      reflectionCount, // Equivalent to StatsData.totalReflections
      consistencyPercentage: parseFloat(consistency.toFixed(2)),
      averageWordsPerDay: parseFloat(averageWordCount.toFixed(2)), // Renamed for compatibility
      mostActiveDay,
      // reflectionStreak: 0, // Placeholder for future streak calculation
      status: "Data KPI dasar. Fitur lanjutan dalam pengembangan.", // Additional info
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
