import { PrismaClient } from "@prisma/client";
import type { ProgressData } from "../types/bot-context.js";

/**
 * Service for tracking and visualizing user progress towards continuous improvement
 */
export class ProgressService {
  constructor(private db: PrismaClient) {}

  /**
   * Calculate cumulative "1% better" progress
   * Based on consistency, mood improvement, and habit development
   */
  async calculateCumulativeProgress(userId: string): Promise<number> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          createdAt: true,
        },
      });

      if (!user) return 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const reflections = await this.db.reflection.findMany({
        where: {
          userId,
          date: { gte: thirtyDaysAgo },
        },
        select: {
          date: true,
          moodScore: true,
          streakDay: true,
          wordCount: true,
        },
        orderBy: { date: "asc" },
      });

      if (reflections.length === 0) return 0;

      // Calculate progress components
      const consistencyScore = this.calculateConsistencyScore(reflections, 30);
      const moodImprovementScore =
        this.calculateMoodImprovementScore(reflections);
      const engagementScore = this.calculateEngagementScore(reflections);
      const streakBonus = Math.min(user.currentStreak * 2, 50); // Max 50% bonus

      // Weighted average for cumulative progress
      const cumulativeProgress = Math.round(
        consistencyScore * 0.4 +
          moodImprovementScore * 0.3 +
          engagementScore * 0.2 +
          streakBonus * 0.1
      );

      return Math.min(100, Math.max(0, cumulativeProgress));
    } catch (error) {
      console.error("❌ Error calculating cumulative progress:", error);
      return 0;
    }
  }

  /**
   * Calculate habit maturity score (progress towards 66-day automation)
   */
  async calculateHabitMaturityScore(userId: string): Promise<number> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true },
      });

      if (!user) return 0;

      // Based on the 66-day habit formation research
      const habitMaturityScore = Math.round((user.currentStreak / 66) * 100);
      return Math.min(100, habitMaturityScore);
    } catch (error) {
      console.error("❌ Error calculating habit maturity score:", error);
      return 0;
    }
  }

  /**
   * Calculate weekly improvement percentage
   */
  async calculateWeeklyImprovement(userId: string): Promise<number> {
    try {
      const now = new Date();
      const lastWeekStart = new Date();
      lastWeekStart.setDate(now.getDate() - 14);
      const thisWeekStart = new Date();
      thisWeekStart.setDate(now.getDate() - 7);

      const [lastWeekReflections, thisWeekReflections] = await Promise.all([
        this.db.reflection.findMany({
          where: {
            userId,
            date: {
              gte: lastWeekStart,
              lt: thisWeekStart,
            },
          },
          select: { moodScore: true, wordCount: true },
        }),
        this.db.reflection.findMany({
          where: {
            userId,
            date: { gte: thisWeekStart },
          },
          select: { moodScore: true, wordCount: true },
        }),
      ]);

      if (
        lastWeekReflections.length === 0 ||
        thisWeekReflections.length === 0
      ) {
        return 0;
      }

      const lastWeekAvg = this.calculateWeeklyAverage(lastWeekReflections);
      const thisWeekAvg = this.calculateWeeklyAverage(thisWeekReflections);

      if (lastWeekAvg === 0) return 0;

      const improvement = ((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100;
      return Math.round(improvement * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error("❌ Error calculating weekly improvement:", error);
      return 0;
    }
  }

  /**
   * Calculate monthly improvement percentage
   */
  async calculateMonthlyImprovement(userId: string): Promise<number> {
    try {
      const now = new Date();
      const lastMonthStart = new Date();
      lastMonthStart.setDate(now.getDate() - 60);
      const thisMonthStart = new Date();
      thisMonthStart.setDate(now.getDate() - 30);

      const [lastMonthReflections, thisMonthReflections] = await Promise.all([
        this.db.reflection.findMany({
          where: {
            userId,
            date: {
              gte: lastMonthStart,
              lt: thisMonthStart,
            },
          },
          select: { moodScore: true, wordCount: true },
        }),
        this.db.reflection.findMany({
          where: {
            userId,
            date: { gte: thisMonthStart },
          },
          select: { moodScore: true, wordCount: true },
        }),
      ]);

      if (
        lastMonthReflections.length === 0 ||
        thisMonthReflections.length === 0
      ) {
        return 0;
      }

      const lastMonthAvg = this.calculateWeeklyAverage(lastMonthReflections);
      const thisMonthAvg = this.calculateWeeklyAverage(thisMonthReflections);

      if (lastMonthAvg === 0) return 0;

      const improvement = ((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100;
      return Math.round(improvement * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error("❌ Error calculating monthly improvement:", error);
      return 0;
    }
  }

  /**
   * Determine progress trend direction
   */
  async getProgressTrendDirection(
    userId: string
  ): Promise<"up" | "down" | "stable"> {
    try {
      const weeklyImprovement = await this.calculateWeeklyImprovement(userId);

      if (weeklyImprovement > 5) return "up";
      if (weeklyImprovement < -5) return "down";
      return "stable";
    } catch (error) {
      console.error("❌ Error determining trend direction:", error);
      return "stable";
    }
  }

  /**
   * Get comprehensive progress data
   */
  async getProgressData(userId: string): Promise<ProgressData> {
    try {
      const [
        cumulativeProgress,
        habitMaturityScore,
        weeklyImprovement,
        monthlyImprovement,
        trendDirection,
      ] = await Promise.all([
        this.calculateCumulativeProgress(userId),
        this.calculateHabitMaturityScore(userId),
        this.calculateWeeklyImprovement(userId),
        this.calculateMonthlyImprovement(userId),
        this.getProgressTrendDirection(userId),
      ]);

      return {
        cumulativeProgress,
        habitMaturityScore,
        weeklyImprovement,
        monthlyImprovement,
        trendDirection,
      };
    } catch (error) {
      console.error("❌ Error getting progress data:", error);
      return {
        cumulativeProgress: 0,
        habitMaturityScore: 0,
        weeklyImprovement: 0,
        monthlyImprovement: 0,
        trendDirection: "stable",
      };
    }
  }

  /**
   * Generate progress visualization text
   */
  async generateProgressVisualization(userId: string): Promise<string> {
    try {
      const progressData = await this.getProgressData(userId);
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true, longestStreak: true },
      });

      if (!user) return "❌ Data pengguna tidak ditemukan";

      const trendEmoji = {
        up: "📈",
        down: "📉",
        stable: "📊",
      };

      const maturityStage = this.getHabitMaturityStage(
        progressData.habitMaturityScore
      );

      let visualization = `🚀 *Progress Transformasi 1% Better*\n\n`;

      // Overall progress
      visualization += `📊 **Progress Kumulatif**: ${progressData.cumulativeProgress}%\n`;
      visualization += `${this.generateProgressBar(
        progressData.cumulativeProgress
      )}\n\n`;

      // Habit maturity
      visualization += `🎯 **Kematangan Kebiasaan**: ${progressData.habitMaturityScore}%\n`;
      visualization += `${this.generateProgressBar(
        progressData.habitMaturityScore
      )} ${maturityStage}\n`;
      visualization += `📅 Hari ke-${user.currentStreak} dari 66 hari otomatisasi\n\n`;

      // Trend analysis
      visualization += `${
        trendEmoji[progressData.trendDirection]
      } **Tren Perkembangan**: ${this.getTrendDescription(
        progressData.trendDirection
      )}\n`;

      if (progressData.weeklyImprovement !== 0) {
        visualization += `📅 Minggu ini: ${
          progressData.weeklyImprovement > 0 ? "+" : ""
        }${progressData.weeklyImprovement}%\n`;
      }

      if (progressData.monthlyImprovement !== 0) {
        visualization += `📆 Bulan ini: ${
          progressData.monthlyImprovement > 0 ? "+" : ""
        }${progressData.monthlyImprovement}%\n`;
      }

      visualization += `\n🏆 **Streak Terbaik**: ${user.longestStreak} hari\n`;

      // Motivational message
      visualization += `\n💪 ${this.getMotivationalMessage(progressData)}`;

      return visualization;
    } catch (error) {
      console.error("❌ Error generating progress visualization:", error);
      return "❌ Gagal memuat visualisasi progress";
    }
  }

  /**
   * Get comparative timeline for progress tracking
   */
  async getComparativeTimeline(
    userId: string,
    days: number = 30
  ): Promise<
    Array<{
      date: Date;
      progressScore: number;
      moodScore?: number;
      streakDay: number;
    }>
  > {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const reflections = await this.db.reflection.findMany({
        where: {
          userId,
          date: { gte: startDate },
        },
        select: {
          date: true,
          moodScore: true,
          streakDay: true,
          wordCount: true,
        },
        orderBy: { date: "asc" },
      });

      return reflections.map((reflection) => {
        // Calculate daily progress score based on multiple factors
        const moodContribution = reflection.moodScore
          ? (reflection.moodScore / 100) * 40
          : 0;
        const streakContribution = Math.min(reflection.streakDay * 2, 30);
        const engagementContribution = Math.min(reflection.wordCount / 10, 30);

        const progressScore = Math.round(
          moodContribution + streakContribution + engagementContribution
        );

        return {
          date: reflection.date,
          progressScore: Math.min(100, progressScore),
          moodScore: reflection.moodScore || undefined,
          streakDay: reflection.streakDay,
        };
      });
    } catch (error) {
      console.error("❌ Error getting comparative timeline:", error);
      return [];
    }
  }

  /**
   * Calculate consistency score based on reflection frequency
   */
  private calculateConsistencyScore(
    reflections: any[],
    totalDays: number
  ): number {
    const reflectionDays = reflections.length;
    const consistencyRate = (reflectionDays / totalDays) * 100;

    // Bonus for consecutive days
    const avgStreakDay =
      reflections.reduce((sum, r) => sum + r.streakDay, 0) / reflections.length;
    const streakBonus = Math.min(avgStreakDay * 5, 25);

    return Math.min(100, consistencyRate + streakBonus);
  }

  /**
   * Calculate mood improvement score
   */
  private calculateMoodImprovementScore(reflections: any[]): number {
    const moodScores = reflections
      .filter((r) => r.moodScore !== null)
      .map((r) => r.moodScore);

    if (moodScores.length < 2) return 50; // Neutral score for insufficient data

    const firstHalf = moodScores.slice(0, Math.floor(moodScores.length / 2));
    const secondHalf = moodScores.slice(Math.floor(moodScores.length / 2));

    if (firstHalf.length === 0 || secondHalf.length === 0) return 50;

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    // Convert mood improvement to percentage score
    const improvement = ((avgSecond - avgFirst) / avgFirst) * 100;
    return Math.max(0, Math.min(100, 50 + improvement));
  }

  /**
   * Calculate engagement score based on reflection quality
   */
  private calculateEngagementScore(reflections: any[]): number {
    if (reflections.length === 0) return 0;

    const avgWordCount =
      reflections.reduce((sum, r) => sum + r.wordCount, 0) / reflections.length;

    // Score based on word count (more words = higher engagement)
    // Assume 50 words is baseline, scale up to 200 words for max score
    const engagementScore = Math.min((avgWordCount / 200) * 100, 100);

    return Math.round(engagementScore);
  }

  /**
   * Calculate weekly average for comparison
   */
  private calculateWeeklyAverage(reflections: any[]): number {
    if (reflections.length === 0) return 0;

    const moodScores = reflections
      .filter((r) => r.moodScore !== null)
      .map((r) => r.moodScore);

    const avgWordCount =
      reflections.reduce((sum, r) => sum + r.wordCount, 0) / reflections.length;

    if (moodScores.length > 0) {
      const avgMoodScore =
        moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
      return avgMoodScore * 0.7 + Math.min(avgWordCount / 5, 30) * 0.3;
    }

    return Math.min(avgWordCount / 5, 100);
  }

  /**
   * Generate visual progress bar
   */
  private generateProgressBar(percentage: number, length: number = 10): string {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return "🟩".repeat(filled) + "⬜".repeat(empty) + ` ${percentage}%`;
  }

  /**
   * Get habit maturity stage description
   */
  private getHabitMaturityStage(score: number): string {
    if (score < 15) return "🌱 Mulai Tumbuh";
    if (score < 35) return "🌿 Berkembang";
    if (score < 55) return "🌳 Mengakar";
    if (score < 80) return "🎯 Hampir Otomatis";
    return "🚀 Terautomatisasi";
  }

  /**
   * Get trend description text
   */
  private getTrendDescription(trend: "up" | "down" | "stable"): string {
    switch (trend) {
      case "up":
        return "Meningkat 📈";
      case "down":
        return "Perlu Perhatian 📉";
      case "stable":
        return "Stabil 📊";
    }
  }

  /**
   * Get motivational message based on progress
   */
  private getMotivationalMessage(progressData: ProgressData): string {
    if (progressData.cumulativeProgress >= 80) {
      return "Luar biasa! Kamu benar-benar menerapkan transformasi 1% setiap hari. Pertahankan momentum ini! 🌟";
    }

    if (progressData.cumulativeProgress >= 60) {
      return "Hebat! Progress kamu sangat solid. Sedikit lagi menuju level master! 💪";
    }

    if (progressData.cumulativeProgress >= 40) {
      return "Bagus! Kamu sudah on track. Konsistensi kecil akan membawa hasil besar! 🚀";
    }

    if (progressData.cumulativeProgress >= 20) {
      return "Mulai bagus! Setiap langkah kecil adalah progress. Terus lanjutkan! 👏";
    }

    return "Perjalanan seribu mil dimulai dari satu langkah. Kamu sudah memulai, itu yang terpenting! 🌟";
  }

  /**
   * Get progress insights and recommendations
   */
  async getProgressInsights(userId: string): Promise<{
    strengths: string[];
    areasToImprove: string[];
    nextActions: string[];
    achievementLevel: string;
  }> {
    try {
      const progressData = await this.getProgressData(userId);
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true },
      });

      const strengths: string[] = [];
      const areasToImprove: string[] = [];
      const nextActions: string[] = [];

      // Analyze strengths
      if (progressData.cumulativeProgress >= 70) {
        strengths.push("Konsistensi refleksi yang luar biasa");
      }
      if (progressData.habitMaturityScore >= 50) {
        strengths.push("Kebiasaan mulai terotomatisasi");
      }
      if (progressData.weeklyImprovement > 0) {
        strengths.push("Tren perkembangan positif");
      }
      if (user && user.currentStreak >= 7) {
        strengths.push("Mempertahankan streak dengan baik");
      }

      // Analyze areas to improve
      if (progressData.cumulativeProgress < 50) {
        areasToImprove.push("Tingkatkan konsistensi refleksi harian");
      }
      if (progressData.habitMaturityScore < 30) {
        areasToImprove.push("Fokus membangun kebiasaan yang lebih kuat");
      }
      if (progressData.weeklyImprovement < 0) {
        areasToImprove.push("Perhatikan tren penurunan minggu ini");
      }

      // Generate next actions
      if (progressData.habitMaturityScore < 66) {
        const daysLeft = Math.ceil(66 - (user?.currentStreak || 0));
        nextActions.push(
          `Lanjutkan streak ${daysLeft} hari lagi untuk otomatisasi penuh`
        );
      }
      if (progressData.cumulativeProgress < 80) {
        nextActions.push("Tingkatkan kualitas refleksi dengan lebih detail");
      }
      if (progressData.trendDirection === "down") {
        nextActions.push(
          "Review kebiasaan minggu lalu dan identifikasi hambatan"
        );
      }

      // Determine achievement level
      let achievementLevel = "Pemula";
      if (progressData.cumulativeProgress >= 80) {
        achievementLevel = "Master Transformer";
      } else if (progressData.cumulativeProgress >= 60) {
        achievementLevel = "Advanced Practitioner";
      } else if (progressData.cumulativeProgress >= 40) {
        achievementLevel = "Consistent Builder";
      } else if (progressData.cumulativeProgress >= 20) {
        achievementLevel = "Growing Learner";
      }

      return {
        strengths,
        areasToImprove,
        nextActions,
        achievementLevel,
      };
    } catch (error) {
      console.error("❌ Error getting progress insights:", error);
      return {
        strengths: [],
        areasToImprove: [],
        nextActions: ["Mulai dengan refleksi harian yang konsisten"],
        achievementLevel: "Pemula",
      };
    }
  }
}
