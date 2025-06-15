import { PrismaClient } from "@prisma/client";
import type { MilestoneData, MilestoneType } from "../types/bot-context.js";

/**
 * Service for managing user milestones and achievements
 */
export class MilestoneService {
  constructor(private db: PrismaClient) {}

  // Milestone definitions with Indonesian messages
  private readonly MILESTONES: Record<
    MilestoneType,
    {
      days: number;
      title: string;
      description: string;
      badge: string;
      celebrationMessage: string;
      motivationalMessage: string;
    }
  > = {
    "3d": {
      days: 3,
      title: "Pencapaian Pertama",
      description: "Konsisten 3 hari berturut-turut",
      badge: "🎉",
      celebrationMessage:
        "🎉 *Pencapaian Pertama Unlocked!*\n\nKamu telah konsisten refleksi selama 3 hari berturut-turut! Ini langkah pertama yang luar biasa menuju kebiasaan yang lebih baik.",
      motivationalMessage:
        "Kebiasaan kecil yang konsisten akan membawa perubahan besar! 💪",
    },
    "7d": {
      days: 7,
      title: "Golden Week",
      description: "Satu minggu konsisten",
      badge: "🏆",
      celebrationMessage:
        "🏆 *Golden Week Achievement!*\n\nLuar biasa! Kamu telah membangun kebiasaan refleksi selama seminggu penuh. Research menunjukkan kebiasaan mulai terbentuk di minggu pertama!",
      motivationalMessage:
        "Kamu sudah membuktikan komitmen pada diri sendiri. Lanjutkan momentum ini! 🔥",
    },
    "21d": {
      days: 21,
      title: "Ritual Baru Terbentuk",
      description: "21 hari - kebiasaan mulai mengakar",
      badge: "💎",
      celebrationMessage:
        "💎 *Ritual Baru Terbentuk!*\n\nIncredible! 21 hari konsisten! Menurut penelitian, ini adalah titik di mana kebiasaan mulai mengakar dan menjadi bagian alami dari rutinmu.",
      motivationalMessage:
        "Kamu tidak lagi memaksakan diri - refleksi sudah menjadi bagian dari dirimu! 🌟",
    },
    "66d": {
      days: 66,
      title: "Master Kebiasaan",
      description: "66 hari - otomatisasi penuh tercapai",
      badge: "🚀",
      celebrationMessage:
        "🚀 *Master Kebiasaan Achieved!*\n\nPhenomenal! 66 hari konsisten! University College London research menunjukkan rata-rata 66 hari dibutuhkan untuk otomatisasi kebiasaan. Kamu telah mencapai level master!",
      motivationalMessage:
        "Kamu telah membuktikan bahwa transformasi 1% setiap hari adalah nyata. Kamu adalah inspirasi! 🌟✨",
    },
  };

  /**
   * Check and potentially unlock new milestones for a user
   */
  async checkAndUnlockMilestones(
    userId: string,
    currentStreak: number
  ): Promise<MilestoneData[]> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { milestones: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Parse current milestones
      const currentMilestones =
        typeof user.milestones === "object" && user.milestones !== null
          ? (user.milestones as Record<string, boolean>)
          : {};

      const newMilestones: MilestoneData[] = [];

      // Check each milestone
      for (const [type, config] of Object.entries(this.MILESTONES) as [
        MilestoneType,
        (typeof this.MILESTONES)[MilestoneType]
      ][]) {
        if (currentStreak >= config.days && !currentMilestones[type]) {
          // New milestone achieved!
          currentMilestones[type] = true;

          const milestoneData: MilestoneData = {
            type,
            achieved: true,
            achievedAt: new Date(),
            title: config.title,
            description: config.description,
            badge: config.badge,
          };

          newMilestones.push(milestoneData);
        }
      }

      // Save updated milestones to database if there are new ones
      if (newMilestones.length > 0) {
        await this.db.user.update({
          where: { id: userId },
          data: { milestones: currentMilestones },
        });

        console.log(
          `🏆 Unlocked ${newMilestones.length} new milestone(s) for user ${userId}`
        );
      }

      return newMilestones;
    } catch (error) {
      console.error("❌ Error checking milestones:", error);
      return [];
    }
  }

  /**
   * Get all milestone data for a user
   */
  async getUserMilestones(userId: string): Promise<MilestoneData[]> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          milestones: true,
          currentStreak: true,
          longestStreak: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const userMilestones =
        typeof user.milestones === "object" && user.milestones !== null
          ? (user.milestones as Record<string, boolean>)
          : {};

      const milestoneData: MilestoneData[] = [];

      // Build milestone data array
      for (const [type, config] of Object.entries(this.MILESTONES) as [
        MilestoneType,
        (typeof this.MILESTONES)[MilestoneType]
      ][]) {
        const achieved = !!userMilestones[type];
        const daysToGo = achieved
          ? 0
          : Math.max(0, config.days - user.currentStreak);

        milestoneData.push({
          type,
          achieved,
          achievedAt: achieved ? new Date() : undefined, // We don't store the exact date, so use current date
          daysToGo,
          title: config.title,
          description: config.description,
          badge: config.badge,
        });
      }

      return milestoneData.sort(
        (a, b) => this.MILESTONES[a.type].days - this.MILESTONES[b.type].days
      );
    } catch (error) {
      console.error("❌ Error getting user milestones:", error);
      return [];
    }
  }

  /**
   * Generate celebration message for a milestone
   */
  generateCelebrationMessage(
    milestoneType: MilestoneType,
    userStats?: {
      moodScoreImprovement?: number;
      reflectionCount?: number;
      consistencyRate?: number;
    }
  ): string {
    const milestone = this.MILESTONES[milestoneType];

    let message = milestone.celebrationMessage + "\n\n";

    // Add personalized stats if provided
    if (userStats) {
      message += "📊 *Pencapaian Personalmu:*\n";

      if (
        userStats.moodScoreImprovement &&
        userStats.moodScoreImprovement > 0
      ) {
        message += `😊 MoodScore meningkat ${userStats.moodScoreImprovement}% dari awal!\n`;
      }

      if (userStats.reflectionCount) {
        message += `📝 Total ${userStats.reflectionCount} refleksi telah kamu tulis\n`;
      }

      if (userStats.consistencyRate && userStats.consistencyRate > 80) {
        message += `🎯 Tingkat konsistensi: ${userStats.consistencyRate.toFixed(
          1
        )}%\n`;
      }

      message += "\n";
    }

    message += milestone.motivationalMessage;

    return message;
  }

  /**
   * Get milestone celebration data with personalized stats
   */
  async getMilestoneCelebrationData(
    userId: string,
    milestoneType: MilestoneType
  ): Promise<{
    message: string;
    badge: string;
    title: string;
    personalStats: {
      moodScoreImprovement?: number;
      reflectionCount?: number;
      consistencyRate?: number;
    };
  }> {
    try {
      // Get user's progress stats for personalization
      const milestone = this.MILESTONES[milestoneType];
      const daysBack = milestone.days;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const reflections = await this.db.reflection.findMany({
        where: {
          userId,
          date: { gte: startDate },
        },
        orderBy: { date: "asc" },
        select: { moodScore: true, date: true },
      });

      // Calculate personalized stats
      const personalStats: {
        moodScoreImprovement?: number;
        reflectionCount?: number;
        consistencyRate?: number;
      } = {
        reflectionCount: reflections.length,
        consistencyRate: (reflections.length / daysBack) * 100,
      };

      // Calculate mood score improvement
      const moodScores = reflections
        .filter((r) => r.moodScore !== null)
        .map((r) => r.moodScore!);
      if (moodScores.length >= 2) {
        const firstHalf = moodScores.slice(
          0,
          Math.floor(moodScores.length / 2)
        );
        const secondHalf = moodScores.slice(Math.floor(moodScores.length / 2));

        if (firstHalf.length > 0 && secondHalf.length > 0) {
          const avgFirst =
            firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
          const avgSecond =
            secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
          personalStats.moodScoreImprovement = Math.round(
            ((avgSecond - avgFirst) / avgFirst) * 100
          );
        }
      }

      const message = this.generateCelebrationMessage(
        milestoneType,
        personalStats
      );

      return {
        message,
        badge: milestone.badge,
        title: milestone.title,
        personalStats,
      };
    } catch (error) {
      console.error("❌ Error generating celebration data:", error);

      // Fallback to basic message
      const milestone = this.MILESTONES[milestoneType];
      return {
        message: this.generateCelebrationMessage(milestoneType),
        badge: milestone.badge,
        title: milestone.title,
        personalStats: {},
      };
    }
  }

  /**
   * Get next milestone for a user
   */
  async getNextMilestone(userId: string): Promise<MilestoneData | null> {
    try {
      const milestones = await this.getUserMilestones(userId);

      // Find the first unachieved milestone
      const nextMilestone = milestones.find((m) => !m.achieved);

      return nextMilestone || null;
    } catch (error) {
      console.error("❌ Error getting next milestone:", error);
      return null;
    }
  }

  /**
   * Get milestone progress visualization
   */
  async getMilestoneProgress(userId: string): Promise<string> {
    try {
      const milestones = await this.getUserMilestones(userId);
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true },
      });

      if (!user) {
        return "❌ Data pengguna tidak ditemukan";
      }

      let progressText = `🏆 *Progress Milestone* (Streak: ${user.currentStreak} hari)\n\n`;

      for (const milestone of milestones) {
        const status = milestone.achieved ? "✅" : "⏳";
        const badge = milestone.achieved ? milestone.badge : "⚪";

        progressText += `${status} ${badge} **${milestone.title}**\n`;
        progressText += `   ${milestone.description}\n`;

        if (!milestone.achieved && milestone.daysToGo !== undefined) {
          progressText += `   📅 ${milestone.daysToGo} hari lagi\n`;
        }

        progressText += "\n";
      }

      // Add progress bar for current milestone
      const nextMilestone = milestones.find((m) => !m.achieved);
      if (nextMilestone) {
        const progress = Math.min(
          100,
          (user.currentStreak / this.MILESTONES[nextMilestone.type].days) * 100
        );
        const progressBar = this.generateProgressBar(progress);
        progressText += `📊 Progress ke ${
          nextMilestone.title
        }:\n${progressBar} ${progress.toFixed(1)}%`;
      }

      return progressText;
    } catch (error) {
      console.error("❌ Error generating milestone progress:", error);
      return "❌ Gagal memuat progress milestone";
    }
  }

  /**
   * Generate visual progress bar
   */
  private generateProgressBar(percentage: number, length: number = 10): string {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return "🟩".repeat(filled) + "⬜".repeat(empty);
  }

  /**
   * Check if user has achieved a specific milestone
   */
  async hasMilestone(
    userId: string,
    milestoneType: MilestoneType
  ): Promise<boolean> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { milestones: true },
      });

      if (!user) {
        return false;
      }

      const milestones =
        typeof user.milestones === "object" && user.milestones !== null
          ? (user.milestones as Record<string, boolean>)
          : {};

      return !!milestones[milestoneType];
    } catch (error) {
      console.error("❌ Error checking milestone:", error);
      return false;
    }
  }

  /**
   * Get milestone statistics
   */
  async getMilestoneStats(userId: string): Promise<{
    totalMilestones: number;
    achievedMilestones: number;
    achievementRate: number;
    nextMilestone?: MilestoneType;
    daysToNext?: number;
  }> {
    try {
      const milestones = await this.getUserMilestones(userId);
      const achieved = milestones.filter((m) => m.achieved);
      const nextMilestone = milestones.find((m) => !m.achieved);

      return {
        totalMilestones: milestones.length,
        achievedMilestones: achieved.length,
        achievementRate: (achieved.length / milestones.length) * 100,
        nextMilestone: nextMilestone?.type,
        daysToNext: nextMilestone?.daysToGo,
      };
    } catch (error) {
      console.error("❌ Error getting milestone stats:", error);
      return {
        totalMilestones: 4,
        achievedMilestones: 0,
        achievementRate: 0,
      };
    }
  }
}
