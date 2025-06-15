import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { MilestoneService } from "./milestone-service.js";

const db = new PrismaClient();
const milestoneService = new MilestoneService(db);

// Test user data
const testUserId = "test-milestone-user-id";
const testTelegramId = "987654321";

describe("MilestoneService", () => {
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

  describe("checkAndUnlockMilestones", () => {
    test("should unlock 3-day milestone for first time", async () => {
      const newMilestones = await milestoneService.checkAndUnlockMilestones(
        testUserId,
        3
      );

      expect(newMilestones).toHaveLength(1);
      expect(newMilestones[0]!.type).toBe("3d");
      expect(newMilestones[0]!.achieved).toBe(true);
      expect(newMilestones[0]!.title).toBe("Pencapaian Pertama");
      expect(newMilestones[0]!.badge).toBe("🎉");
      expect(newMilestones[0]!.achievedAt).toBeDefined();

      // Verify it's saved in database
      const user = await db.user.findUnique({
        where: { id: testUserId },
        select: { milestones: true },
      });

      expect(user).not.toBeNull();
      const milestones = user?.milestones as Record<string, boolean>;
      expect(milestones["3d"]).toBe(true);
    });

    test("should unlock multiple milestones at once", async () => {
      const newMilestones = await milestoneService.checkAndUnlockMilestones(
        testUserId,
        7
      );

      expect(newMilestones).toHaveLength(2);

      const milestoneTypes = newMilestones.map((m) => m.type);
      expect(milestoneTypes).toContain("3d");
      expect(milestoneTypes).toContain("7d");

      // Verify both are saved in database
      const user = await db.user.findUnique({
        where: { id: testUserId },
        select: { milestones: true },
      });

      expect(user).not.toBeNull();
      const milestones = user?.milestones as Record<string, boolean>;
      expect(milestones["3d"]).toBe(true);
      expect(milestones["7d"]).toBe(true);
    });

    test("should not unlock already achieved milestones", async () => {
      // Pre-set some milestones
      await db.user.update({
        where: { id: testUserId },
        data: {
          milestones: { "3d": true, "7d": true },
        },
      });

      const newMilestones = await milestoneService.checkAndUnlockMilestones(
        testUserId,
        21
      );

      expect(newMilestones).toHaveLength(1);
      expect(newMilestones[0]!.type).toBe("21d");
    });

    test("should not unlock milestones when streak is insufficient", async () => {
      const newMilestones = await milestoneService.checkAndUnlockMilestones(
        testUserId,
        2
      );

      expect(newMilestones).toHaveLength(0);
    });

    test("should unlock master milestone at 66 days", async () => {
      const newMilestones = await milestoneService.checkAndUnlockMilestones(
        testUserId,
        66
      );

      expect(newMilestones).toHaveLength(4);

      const milestoneTypes = newMilestones.map((m) => m.type);
      expect(milestoneTypes).toContain("3d");
      expect(milestoneTypes).toContain("7d");
      expect(milestoneTypes).toContain("21d");
      expect(milestoneTypes).toContain("66d");

      const masterMilestone = newMilestones.find((m) => m.type === "66d");
      expect(masterMilestone).toBeDefined();
      expect(masterMilestone!.title).toBe("Master Kebiasaan");
      expect(masterMilestone!.badge).toBe("🚀");
    });

    test("should handle non-existent user gracefully", async () => {
      const newMilestones = await milestoneService.checkAndUnlockMilestones(
        "non-existent",
        10
      );
      expect(newMilestones).toHaveLength(0);
    });
  });

  describe("getUserMilestones", () => {
    test("should return all milestones with correct status", async () => {
      // Set user with some milestones achieved
      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 10,
          milestones: { "3d": true, "7d": true },
        },
      });

      const milestones = await milestoneService.getUserMilestones(testUserId);

      expect(milestones).toHaveLength(4);

      // Check 3d milestone
      const threeDayMilestone = milestones.find((m) => m.type === "3d");
      expect(threeDayMilestone).toBeDefined();
      expect(threeDayMilestone!.achieved).toBe(true);
      expect(threeDayMilestone!.daysToGo).toBe(0);

      // Check 7d milestone
      const sevenDayMilestone = milestones.find((m) => m.type === "7d");
      expect(sevenDayMilestone).toBeDefined();
      expect(sevenDayMilestone!.achieved).toBe(true);
      expect(sevenDayMilestone!.daysToGo).toBe(0);

      // Check 21d milestone (not achieved)
      const twentyOneDayMilestone = milestones.find((m) => m.type === "21d");
      expect(twentyOneDayMilestone).toBeDefined();
      expect(twentyOneDayMilestone!.achieved).toBe(false);
      expect(twentyOneDayMilestone!.daysToGo).toBe(11); // 21 - 10 = 11

      // Check 66d milestone (not achieved)
      const sixtySixDayMilestone = milestones.find((m) => m.type === "66d");
      expect(sixtySixDayMilestone).toBeDefined();
      expect(sixtySixDayMilestone!.achieved).toBe(false);
      expect(sixtySixDayMilestone!.daysToGo).toBe(56); // 66 - 10 = 56
    });

    test("should return milestones sorted by days required", async () => {
      const milestones = await milestoneService.getUserMilestones(testUserId);

      expect(milestones[0]!.type).toBe("3d");
      expect(milestones[1]!.type).toBe("7d");
      expect(milestones[2]!.type).toBe("21d");
      expect(milestones[3]!.type).toBe("66d");
    });

    test("should handle user with no milestones", async () => {
      const milestones = await milestoneService.getUserMilestones(testUserId);

      expect(milestones).toHaveLength(4);
      expect(milestones.every((m) => !m.achieved)).toBe(true);
    });
  });

  describe("generateCelebrationMessage", () => {
    test("should generate basic celebration message", async () => {
      const message = milestoneService.generateCelebrationMessage("3d");

      expect(message).toContain("Pencapaian Pertama Unlocked!");
      expect(message).toContain("3 hari berturut-turut");
      expect(message).toContain("Kebiasaan kecil yang konsisten");
    });

    test("should include personalized stats when provided", async () => {
      const message = milestoneService.generateCelebrationMessage("7d", {
        moodScoreImprovement: 15,
        reflectionCount: 7,
        consistencyRate: 100,
      });

      expect(message).toContain("Pencapaian Personalmu");
      expect(message).toContain("MoodScore meningkat 15%");
      expect(message).toContain("Total 7 refleksi");
      expect(message).toContain("Tingkat konsistensi: 100.0%");
    });

    test("should handle stats with no mood improvement", async () => {
      const message = milestoneService.generateCelebrationMessage("21d", {
        reflectionCount: 21,
        consistencyRate: 95,
      });

      expect(message).toContain("Pencapaian Personalmu");
      expect(message).toContain("Total 21 refleksi");
      expect(message).toContain("Tingkat konsistensi: 95.0%");
      expect(message).not.toContain("MoodScore meningkat");
    });
  });

  describe("getMilestoneCelebrationData", () => {
    test("should return celebration data with personalized stats", async () => {
      // Create test reflections for the past 7 days
      const dates = [];
      for (let i = 0; i < 7; i++) {
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
          moodScore: 82 - index * 2, // Decreasing mood scores to show improvement over time
          streakDay: index + 1,
        })),
      });

      const celebrationData =
        await milestoneService.getMilestoneCelebrationData(testUserId, "7d");

      expect(celebrationData.badge).toBe("🏆");
      expect(celebrationData.title).toBe("Golden Week");
      expect(celebrationData.message).toContain("Golden Week Achievement!");
      expect(celebrationData.personalStats).toBeDefined();
      expect(celebrationData.personalStats!.reflectionCount).toBe(7);
      expect(celebrationData.personalStats!.consistencyRate).toBe(100);
      expect(
        celebrationData.personalStats!.moodScoreImprovement
      ).toBeGreaterThan(0);
    });

    test("should handle user with no reflections", async () => {
      const celebrationData =
        await milestoneService.getMilestoneCelebrationData(testUserId, "3d");

      expect(celebrationData.badge).toBe("🎉");
      expect(celebrationData.title).toBe("Pencapaian Pertama");
      expect(celebrationData.personalStats).toBeDefined();
      expect(celebrationData.personalStats!.reflectionCount).toBe(0);
      expect(celebrationData.personalStats!.consistencyRate).toBe(0);
    });
  });

  describe("getNextMilestone", () => {
    test("should return next unachieved milestone", async () => {
      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 5,
          milestones: { "3d": true },
        },
      });

      const nextMilestone = await milestoneService.getNextMilestone(testUserId);

      expect(nextMilestone).toBeDefined();
      expect(nextMilestone?.type).toBe("7d");
      expect(nextMilestone?.achieved).toBe(false);
      expect(nextMilestone?.daysToGo).toBe(2); // 7 - 5 = 2
    });

    test("should return null when all milestones achieved", async () => {
      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 100,
          milestones: { "3d": true, "7d": true, "21d": true, "66d": true },
        },
      });

      const nextMilestone = await milestoneService.getNextMilestone(testUserId);

      expect(nextMilestone).toBeNull();
    });

    test("should return first milestone for new user", async () => {
      const nextMilestone = await milestoneService.getNextMilestone(testUserId);

      expect(nextMilestone).toBeDefined();
      expect(nextMilestone?.type).toBe("3d");
      expect(nextMilestone?.achieved).toBe(false);
      expect(nextMilestone?.daysToGo).toBe(3);
    });
  });

  describe("getMilestoneProgress", () => {
    test("should generate progress visualization", async () => {
      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 5,
          milestones: { "3d": true },
        },
      });

      const progress = await milestoneService.getMilestoneProgress(testUserId);

      expect(progress).toContain("Progress Milestone");
      expect(progress).toContain("Streak: 5 hari");
      expect(progress).toContain("✅ 🎉 **Pencapaian Pertama**");
      expect(progress).toContain("⏳ ⚪ **Golden Week**");
      expect(progress).toContain("2 hari lagi");
      expect(progress).toContain("Progress ke Golden Week");
      expect(progress).toContain("🟩"); // Progress bar
    });

    test("should handle user with no progress", async () => {
      const progress = await milestoneService.getMilestoneProgress(testUserId);

      expect(progress).toContain("Progress Milestone");
      expect(progress).toContain("Streak: 0 hari");
      expect(progress).toContain("⏳ ⚪ **Pencapaian Pertama**");
      expect(progress).toContain("3 hari lagi");
    });
  });

  describe("hasMilestone", () => {
    test("should return true for achieved milestone", async () => {
      await db.user.update({
        where: { id: testUserId },
        data: {
          milestones: { "3d": true, "7d": true },
        },
      });

      const has3d = await milestoneService.hasMilestone(testUserId, "3d");
      const has7d = await milestoneService.hasMilestone(testUserId, "7d");
      const has21d = await milestoneService.hasMilestone(testUserId, "21d");

      expect(has3d).toBe(true);
      expect(has7d).toBe(true);
      expect(has21d).toBe(false);
    });

    test("should return false for non-existent user", async () => {
      const hasMilestone = await milestoneService.hasMilestone(
        "non-existent",
        "3d"
      );
      expect(hasMilestone).toBe(false);
    });
  });

  describe("getMilestoneStats", () => {
    test("should calculate milestone statistics correctly", async () => {
      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 10,
          milestones: { "3d": true, "7d": true },
        },
      });

      const stats = await milestoneService.getMilestoneStats(testUserId);

      expect(stats.totalMilestones).toBe(4);
      expect(stats.achievedMilestones).toBe(2);
      expect(stats.achievementRate).toBe(50);
      expect(stats.nextMilestone).toBe("21d");
      expect(stats.daysToNext).toBe(11); // 21 - 10 = 11
    });

    test("should handle user with no milestones", async () => {
      const stats = await milestoneService.getMilestoneStats(testUserId);

      expect(stats.totalMilestones).toBe(4);
      expect(stats.achievedMilestones).toBe(0);
      expect(stats.achievementRate).toBe(0);
      expect(stats.nextMilestone).toBe("3d");
      expect(stats.daysToNext).toBe(3);
    });

    test("should handle user with all milestones achieved", async () => {
      await db.user.update({
        where: { id: testUserId },
        data: {
          currentStreak: 100,
          milestones: { "3d": true, "7d": true, "21d": true, "66d": true },
        },
      });

      const stats = await milestoneService.getMilestoneStats(testUserId);

      expect(stats.totalMilestones).toBe(4);
      expect(stats.achievedMilestones).toBe(4);
      expect(stats.achievementRate).toBe(100);
      expect(stats.nextMilestone).toBeUndefined();
      expect(stats.daysToNext).toBeUndefined();
    });
  });
});
