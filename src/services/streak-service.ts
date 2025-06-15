import { PrismaClient } from "@prisma/client";
import type { User } from "@prisma/client";
import type { StreakData } from "../types/bot-context.js";

/**
 * Service for managing user streaks and habit consistency
 */
export class StreakService {
  constructor(private db: PrismaClient) {}

  /**
   * Updates user's streak based on current activity
   * Handles streak increments, resets, and forgiveness logic
   */
  async updateStreak(userId: string): Promise<StreakData> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        currentStreak: true,
        longestStreak: true,
        lastActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date();
    const today = this.getDateOnly(now);
    const lastActiveDate = user.lastActive
      ? this.getDateOnly(user.lastActive)
      : null;

    let newStreak = user.currentStreak;
    let newLongestStreak = user.longestStreak;
    let streakMaintained = true;

    // Check if this is the first activity ever
    if (!lastActiveDate) {
      newStreak = 1;
    } else {
      const daysDifference = this.getDaysDifference(lastActiveDate, today);

      if (daysDifference === 0) {
        // Same day activity - maintain current streak
        newStreak = user.currentStreak;
      } else if (daysDifference === 1) {
        // Consecutive day - increment streak
        newStreak = user.currentStreak + 1;
      } else if (daysDifference <= 2) {
        // 1-2 day gap - apply forgiveness logic (1 missed day per week)
        const weeksSinceStart = Math.floor(user.currentStreak / 7);
        const allowedMissedDays = Math.max(1, weeksSinceStart);

        if (daysDifference <= allowedMissedDays) {
          // Forgiveness applied - maintain streak with small penalty
          newStreak = Math.max(1, user.currentStreak - 1);
        } else {
          // Reset streak
          newStreak = 1;
          streakMaintained = false;
        }
      } else {
        // Too many days missed - reset streak
        newStreak = 1;
        streakMaintained = false;
      }
    }

    // Update longest streak if current streak exceeds it
    if (newStreak > user.longestStreak) {
      newLongestStreak = newStreak;
    }

    // Update user in database
    const updatedUser = await this.db.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastActive: now,
      },
    });

    return {
      currentStreak: updatedUser.currentStreak,
      longestStreak: updatedUser.longestStreak,
      lastActive: updatedUser.lastActive || undefined,
      streakMaintained,
    };
  }

  /**
   * Gets current streak data for a user
   */
  async getStreakData(userId: string): Promise<StreakData> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActive: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const streakMaintained = await this.checkStreakMaintenance(userId);

    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastActive: user.lastActive || undefined,
      streakMaintained,
    };
  }

  /**
   * Checks if user's streak is still maintained (not at risk)
   */
  async checkStreakMaintenance(userId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        lastActive: true,
        currentStreak: true,
      },
    });

    if (!user || !user.lastActive) {
      return false;
    }

    const now = new Date();
    const lastActiveDate = this.getDateOnly(user.lastActive);
    const today = this.getDateOnly(now);
    const daysSinceLastActive = this.getDaysDifference(lastActiveDate, today);

    // Streak is maintained if last active was today or yesterday
    return daysSinceLastActive <= 1;
  }

  /**
   * Resets user's streak (used for streak recovery scenarios)
   */
  async resetStreak(userId: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: {
        currentStreak: 0,
      },
    });
  }

  /**
   * Gets streak recovery status and suggestions
   */
  async getStreakRecoveryInfo(userId: string): Promise<{
    canRecover: boolean;
    daysMissed: number;
    recoveryMessage: string;
  }> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        lastActive: true,
        currentStreak: true,
      },
    });

    if (!user || !user.lastActive) {
      return {
        canRecover: false,
        daysMissed: 0,
        recoveryMessage: "Mulai streak baru hari ini! 🚀",
      };
    }

    const now = new Date();
    const lastActiveDate = this.getDateOnly(user.lastActive);
    const today = this.getDateOnly(now);
    const daysMissed = this.getDaysDifference(lastActiveDate, today);

    const weeksSinceStart = Math.floor(user.currentStreak / 7);
    const allowedMissedDays = Math.max(1, weeksSinceStart);
    const canRecover = daysMissed <= allowedMissedDays && daysMissed > 0;

    let recoveryMessage = "";
    if (canRecover) {
      recoveryMessage = `Kamu bisa memulihkan streak! Hanya terlewat ${daysMissed} hari. Lanjutkan refleksi hari ini! 💪`;
    } else if (daysMissed === 0) {
      recoveryMessage = "Streak kamu masih aman! Lanjutkan momentum ini! 🔥";
    } else {
      recoveryMessage = `Streak terputus, tapi tidak apa-apa! Mulai fresh streak hari ini. Ini kesempatan untuk lebih konsisten! 🌟`;
    }

    return {
      canRecover,
      daysMissed,
      recoveryMessage,
    };
  }

  /**
   * Gets streak calendar data for visualization (last 30 days)
   */
  async getStreakCalendar(userId: string): Promise<
    Array<{
      date: Date;
      hasReflection: boolean;
      streakDay: number;
      moodScore?: number;
    }>
  > {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reflections = await this.db.reflection.findMany({
      where: {
        userId: userId,
        date: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        date: true,
        streakDay: true,
        moodScore: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    const calendar: Array<{
      date: Date;
      hasReflection: boolean;
      streakDay: number;
      moodScore?: number;
    }> = [];

    // Generate calendar for last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateOnly = this.getDateOnly(date);

      const reflection = reflections.find(
        (r) => this.getDateOnly(r.date).getTime() === dateOnly.getTime()
      );

      calendar.push({
        date: dateOnly,
        hasReflection: !!reflection,
        streakDay: reflection?.streakDay || 0,
        moodScore: reflection?.moodScore || undefined,
      });
    }

    return calendar;
  }

  /**
   * Helper method to get date without time component
   */
  private getDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Helper method to calculate days difference between two dates
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Gets streak statistics for analytics
   */
  async getStreakStats(userId: string): Promise<{
    totalDaysActive: number;
    averageStreakLength: number;
    streakConsistencyRate: number;
    longestStreakThisMonth: number;
  }> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        longestStreak: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reflections = await this.db.reflection.findMany({
      where: {
        userId: userId,
        date: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        date: true,
        streakDay: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    const totalDaysActive = reflections.length;
    const totalPossibleDays = Math.min(
      30,
      Math.ceil(
        (new Date().getTime() - user.createdAt.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    const streakConsistencyRate =
      totalPossibleDays > 0 ? (totalDaysActive / totalPossibleDays) * 100 : 0;

    const longestStreakThisMonth = Math.max(
      ...reflections.map((r) => r.streakDay),
      0
    );

    // Calculate average streak length (simplified calculation)
    const averageStreakLength =
      totalDaysActive > 0
        ? reflections.reduce((sum, r) => sum + r.streakDay, 0) / totalDaysActive
        : 0;

    return {
      totalDaysActive,
      averageStreakLength: Math.round(averageStreakLength * 100) / 100,
      streakConsistencyRate: Math.round(streakConsistencyRate * 100) / 100,
      longestStreakThisMonth,
    };
  }
}
