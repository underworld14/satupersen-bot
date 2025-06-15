import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { StreakService } from "./streak-service.js";

const db = new PrismaClient();
const streakService = new StreakService(db);

// Test user data
const testUserId = "test-streak-user-id";
const testTelegramId = "123456789";

describe("StreakService", () => {
  beforeEach(async () => {
    // Clean up existing test data
    await db.reflection.deleteMany({
      where: { user: { telegramId: testTelegramId } },
    });
    await db.user.deleteMany({
      where: { telegramId: testTelegramId },
    });

    // Create test user
    await db.user.create({
      data: {
        id: testUserId,
        telegramId: testTelegramId,
        username: "testuser",
        firstName: "Test",
        currentStreak: 0,
        longestStreak: 0,
        lastActive: null,
        milestones: {},
        habitPrefs: [],
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.reflection.deleteMany({
      where: { user: { telegramId: testTelegramId } },
    });
    await db.user.deleteMany({
      where: { telegramId: testTelegramId },
    });
  });

  describe("updateStreak", () => {
    test("should start streak at 1 for first-time user", async () => {
      const result = await streakService.updateStreak(testUserId);

      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.streakMaintained).toBe(true);
      expect(result.lastActive).toBeDefined();
    });

    test("should increment streak for consecutive days", async () => {
      // Set up user with yesterday's activity
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 5,
          longestStreak: 10,
          lastActive: yesterday,
        },
      });

      const result = await streakService.updateStreak(testUserId);

      expect(result.currentStreak).toBe(6);
      expect(result.longestStreak).toBe(10); // Should remain same
      expect(result.streakMaintained).toBe(true);
    });

    test("should maintain streak for same day activity", async () => {
      // Set up user with today's activity (earlier)
      const earlierToday = new Date();
      earlierToday.setHours(earlierToday.getHours() - 2);

      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 3,
          longestStreak: 5,
          lastActive: earlierToday,
        },
      });

      const result = await streakService.updateStreak(testUserId);

      expect(result.currentStreak).toBe(3); // Should remain same
      expect(result.longestStreak).toBe(5);
      expect(result.streakMaintained).toBe(true);
    });

    test("should apply forgiveness for 1-2 day gaps with sufficient streak", async () => {
      // Set up user with 2-day gap but long streak (allowing forgiveness)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);

      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 14, // 2 weeks, allows 2 missed days
          longestStreak: 20,
          lastActive: threeDaysAgo,
        },
      });

      const result = await streakService.updateStreak(testUserId);

      expect(result.currentStreak).toBe(13); // Penalty applied but not reset
      expect(result.longestStreak).toBe(20);
      expect(result.streakMaintained).toBe(true);
    });

    test("should reset streak for too many missed days", async () => {
      // Set up user with 5-day gap
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 10,
          longestStreak: 15,
          lastActive: fiveDaysAgo,
        },
      });

      const result = await streakService.updateStreak(testUserId);

      expect(result.currentStreak).toBe(1); // Reset to new streak
      expect(result.longestStreak).toBe(15); // Should remain same
      expect(result.streakMaintained).toBe(false);
    });

    test("should update longest streak when current exceeds it", async () => {
      // Set up user approaching longest streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 19,
          longestStreak: 19,
          lastActive: yesterday,
        },
      });

      const result = await streakService.updateStreak(testUserId);

      expect(result.currentStreak).toBe(20);
      expect(result.longestStreak).toBe(20); // Should be updated
      expect(result.streakMaintained).toBe(true);
    });

    test("should throw error for non-existent user", async () => {
      expect(async () => {
        await streakService.updateStreak("non-existent-user");
      }).toThrow("User not found");
    });
  });

  describe("getStreakData", () => {
    test("should return current streak data", async () => {
      const testDate = new Date();

      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 7,
          longestStreak: 12,
          lastActive: testDate,
        },
      });

      const result = await streakService.getStreakData(testUserId);

      expect(result.currentStreak).toBe(7);
      expect(result.longestStreak).toBe(12);
      expect(result.lastActive).toEqual(testDate);
    });

    test("should handle user without lastActive", async () => {
      const result = await streakService.getStreakData(testUserId);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.lastActive).toBeUndefined();
      expect(result.streakMaintained).toBe(false);
    });
  });

  describe("checkStreakMaintenance", () => {
    test("should return true for today's activity", async () => {
      await db.user.update({
        where: { id: testUserId },
        data: {
          lastActive: new Date(),
          currentStreak: 5,
        },
      });

      const result = await streakService.checkStreakMaintenance(testUserId);
      expect(result).toBe(true);
    });

    test("should return true for yesterday's activity", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await db.user.update({
        where: { id: testUserId },
        data: {
          lastActive: yesterday,
          currentStreak: 5,
        },
      });

      const result = await streakService.checkStreakMaintenance(testUserId);
      expect(result).toBe(true);
    });

    test("should return false for older activity", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      await db.user.update({
        where: { id: testUserId },
        data: {
          lastActive: threeDaysAgo,
          currentStreak: 5,
        },
      });

      const result = await streakService.checkStreakMaintenance(testUserId);
      expect(result).toBe(false);
    });

    test("should return false for user with no activity", async () => {
      const result = await streakService.checkStreakMaintenance(testUserId);
      expect(result).toBe(false);
    });
  });

  describe("getStreakRecoveryInfo", () => {
    test("should return recovery info for recoverable streak", async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      await db.user.update({
        where: { id: testUserId },
        data: {
          lastActive: twoDaysAgo,
          currentStreak: 14, // Allows forgiveness
        },
      });

      const result = await streakService.getStreakRecoveryInfo(testUserId);

      expect(result.canRecover).toBe(true);
      expect(result.daysMissed).toBe(2);
      expect(result.recoveryMessage).toContain("memulihkan streak");
    });

    test("should return no recovery for long gaps", async () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      await db.user.update({
        where: { id: testUserId },
        data: {
          lastActive: tenDaysAgo,
          currentStreak: 5,
        },
      });

      const result = await streakService.getStreakRecoveryInfo(testUserId);

      expect(result.canRecover).toBe(false);
      expect(result.daysMissed).toBe(10);
      expect(result.recoveryMessage).toContain("fresh streak");
    });

    test("should return safe message for current activity", async () => {
      await db.user.update({
        where: { id: testUserId },
        data: {
          lastActive: new Date(),
          currentStreak: 5,
        },
      });

      const result = await streakService.getStreakRecoveryInfo(testUserId);

      expect(result.canRecover).toBe(false);
      expect(result.daysMissed).toBe(0);
      expect(result.recoveryMessage).toContain("masih aman");
    });
  });

  describe("getStreakCalendar", () => {
    test("should return 30-day calendar with reflection data", async () => {
      // Create some test reflections
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(today.getDate() - 2);

      await db.reflection.createMany({
        data: [
          {
            userId: testUserId,
            date: today,
            input: "Today's reflection",
            aiSummary: "AI summary",
            moodScore: 85,
            streakDay: 3,
          },
          {
            userId: testUserId,
            date: yesterday,
            input: "Yesterday's reflection",
            aiSummary: "AI summary",
            moodScore: 75,
            streakDay: 2,
          },
          {
            userId: testUserId,
            date: twoDaysAgo,
            input: "Two days ago reflection",
            aiSummary: "AI summary",
            moodScore: 90,
            streakDay: 1,
          },
        ],
      });

      const calendar = await streakService.getStreakCalendar(testUserId);

      expect(calendar).toHaveLength(30);

      // Check today's data (last item in calendar)
      const todayEntry = calendar.find(
        (entry) => entry.date.toDateString() === today.toDateString()
      );

      expect(todayEntry).toBeDefined();
      expect(todayEntry?.hasReflection).toBe(true);
      expect(todayEntry?.streakDay).toBe(3);
      expect(todayEntry?.moodScore).toBe(85);

      // Check a day without reflection
      const emptyDay = calendar.find((entry) => !entry.hasReflection);
      expect(emptyDay).toBeDefined();
      expect(emptyDay?.streakDay).toBe(0);
      expect(emptyDay?.moodScore).toBeUndefined();
    });
  });

  describe("getStreakStats", () => {
    test("should calculate streak statistics correctly", async () => {
      // Create test reflections for the past few days
      const dates = [];
      for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date);
      }

      await db.reflection.createMany({
        data: dates.map((date, index) => ({
          userId: testUserId,
          date: date,
          input: `Reflection ${index}`,
          aiSummary: "AI summary",
          streakDay: index + 1,
        })),
      });

      const stats = await streakService.getStreakStats(testUserId);

      expect(stats.totalDaysActive).toBe(10);
      expect(stats.averageStreakLength).toBeGreaterThan(0);
      expect(stats.streakConsistencyRate).toBeGreaterThan(0);
      expect(stats.longestStreakThisMonth).toBe(10);
    });

    test("should handle user with no reflections", async () => {
      const stats = await streakService.getStreakStats(testUserId);

      expect(stats.totalDaysActive).toBe(0);
      expect(stats.averageStreakLength).toBe(0);
      expect(stats.streakConsistencyRate).toBe(0);
      expect(stats.longestStreakThisMonth).toBe(0);
    });
  });

  describe("resetStreak", () => {
    test("should reset user streak to 0", async () => {
      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 15,
          longestStreak: 20,
        },
      });

      await streakService.resetStreak(testUserId);

      const user = await db.user.findUnique({
        where: { id: testUserId },
        select: { currentStreak: true, longestStreak: true },
      });

      expect(user?.currentStreak).toBe(0);
      expect(user?.longestStreak).toBe(20); // Should remain unchanged
    });
  });
});
