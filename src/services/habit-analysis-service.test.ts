import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { HabitAnalysisService } from "./habit-analysis-service.js";

const db = new PrismaClient();
const habitAnalysisService = new HabitAnalysisService(db);

// Test user data
const testUserId = "test-habit-user-id";
const testTelegramId = "123987654";

describe("HabitAnalysisService", () => {
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

  describe("analyzeHabitPatterns", () => {
    test("should return empty results for user with no reflections", async () => {
      const result = await habitAnalysisService.analyzeHabitPatterns(
        testUserId,
        7
      );

      expect(result.identifiedHabits).toHaveLength(0);
      expect(result.anchorHabits).toHaveLength(0);
      expect(result.categories).toHaveLength(0);
      expect(result.consistency).toEqual({});
      expect(result.recommendations).toHaveLength(0);
    });

    test("should identify habits from reflection text", async () => {
      // Create test reflections with habit keywords
      const reflections = [
        "Hari ini saya olahraga pagi dan minum kopi",
        "Saya baca buku dan meditasi sebelum tidur",
        "Workout di gym dan makan sehat hari ini",
      ];

      for (let i = 0; i < reflections.length; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        await db.reflection.create({
          data: {
            userId: testUserId,
            date: date,
            input: reflections[i]!,
            aiSummary: "AI summary",
            streakDay: i + 1,
          },
        });
      }

      const result = await habitAnalysisService.analyzeHabitPatterns(
        testUserId,
        7
      );

      expect(result.identifiedHabits.length).toBeGreaterThan(0);
      expect(result.identifiedHabits).toContain("olahraga");
      expect(result.identifiedHabits).toContain("minum kopi");
      expect(result.identifiedHabits).toContain("baca");
      expect(result.identifiedHabits).toContain("meditasi");
      expect(result.identifiedHabits).toContain("workout");
    });

    test("should categorize habits correctly", async () => {
      // Create reflections with various habit categories
      await db.reflection.create({
        data: {
          userId: testUserId,
          date: new Date(),
          input:
            "Hari ini saya olahraga, baca buku, dan meditasi. Juga kerja project penting.",
          aiSummary: "AI summary",
          streakDay: 1,
        },
      });

      const result = await habitAnalysisService.analyzeHabitPatterns(
        testUserId,
        7
      );

      expect(result.categories).toContain("fitness");
      expect(result.categories).toContain("learning");
      expect(result.categories).toContain("mindfulness");
      expect(result.categories).toContain("productivity");
    });

    test("should identify anchor habits", async () => {
      await db.reflection.create({
        data: {
          userId: testUserId,
          date: new Date(),
          input:
            "Bangun pagi, minum kopi, lalu olahraga. Sebelum tidur saya baca buku.",
          aiSummary: "AI summary",
          streakDay: 1,
        },
      });

      const result = await habitAnalysisService.analyzeHabitPatterns(
        testUserId,
        7
      );

      expect(result.anchorHabits.length).toBeGreaterThan(0);
      // Should identify anchor habits like "pagi", "kopi", "tidur"
    });

    test("should calculate habit consistency", async () => {
      // Create multiple reflections with varying streak days
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        await db.reflection.create({
          data: {
            userId: testUserId,
            date: date,
            input: `Reflection ${i}: olahraga dan baca`,
            aiSummary: "AI summary",
            streakDay: i + 1,
          },
        });
      }

      const result = await habitAnalysisService.analyzeHabitPatterns(
        testUserId,
        7
      );

      expect(result.consistency).toHaveProperty("reflection");
      expect(result.consistency).toHaveProperty("overall");
      expect(result.consistency.reflection).toBeGreaterThan(0);
      expect(result.consistency.overall).toBeGreaterThan(0);
    });
  });

  describe("getUserHabitPreferences", () => {
    test("should return empty array for user with no preferences", async () => {
      const preferences = await habitAnalysisService.getUserHabitPreferences(
        testUserId
      );
      expect(preferences).toEqual([]);
    });

    test("should return user's habit preferences", async () => {
      await db.user.update({
        where: { id: testUserId },
        data: { habitPrefs: ["fitness", "mindfulness"] },
      });

      const preferences = await habitAnalysisService.getUserHabitPreferences(
        testUserId
      );
      expect(preferences).toEqual(["fitness", "mindfulness"]);
    });
  });

  describe("updateUserPreferences", () => {
    test("should add new preference when liked", async () => {
      await habitAnalysisService.updateUserPreferences(
        testUserId,
        "fitness",
        true
      );

      const user = await db.user.findUnique({
        where: { id: testUserId },
        select: { habitPrefs: true },
      });

      expect(user?.habitPrefs).toContain("fitness");
    });

    test("should remove preference when disliked", async () => {
      // First add a preference
      await db.user.update({
        where: { id: testUserId },
        data: { habitPrefs: ["fitness", "mindfulness"] },
      });

      await habitAnalysisService.updateUserPreferences(
        testUserId,
        "fitness",
        false
      );

      const user = await db.user.findUnique({
        where: { id: testUserId },
        select: { habitPrefs: true },
      });

      expect(user?.habitPrefs).not.toContain("fitness");
      expect(user?.habitPrefs).toContain("mindfulness");
    });

    test("should not add duplicate preference", async () => {
      await db.user.update({
        where: { id: testUserId },
        data: { habitPrefs: ["fitness"] },
      });

      await habitAnalysisService.updateUserPreferences(
        testUserId,
        "fitness",
        true
      );

      const user = await db.user.findUnique({
        where: { id: testUserId },
        select: { habitPrefs: true },
      });

      expect(user?.habitPrefs.filter((p) => p === "fitness")).toHaveLength(1);
    });
  });

  describe("getHabitStackingSuggestions", () => {
    test("should return default suggestions for user with no reflections", async () => {
      const suggestions =
        await habitAnalysisService.getHabitStackingSuggestions(testUserId);

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]).toHaveProperty("anchorHabit");
      expect(suggestions[0]).toHaveProperty("newHabit");
      expect(suggestions[0]).toHaveProperty("suggestion");
      expect(suggestions[0]).toHaveProperty("confidence");
      expect(suggestions[0]).toHaveProperty("category");
    });

    test("should generate suggestions based on user's habit patterns", async () => {
      // Create reflections with identifiable habits
      await db.reflection.create({
        data: {
          userId: testUserId,
          date: new Date(),
          input: "Bangun pagi, minum kopi, lalu olahraga. Sore hari baca buku.",
          aiSummary: "AI summary",
          streakDay: 1,
        },
      });

      const suggestions =
        await habitAnalysisService.getHabitStackingSuggestions(testUserId);

      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("anchorHabit");
        expect(suggestion).toHaveProperty("newHabit");
        expect(suggestion).toHaveProperty("suggestion");
        expect(suggestion.confidence).toBeGreaterThanOrEqual(1);
        expect(suggestion.confidence).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("trackHabitSuccess", () => {
    test("should return zero metrics for user with no reflections", async () => {
      const result = await habitAnalysisService.trackHabitSuccess(
        testUserId,
        "fitness"
      );

      expect(result.successRate).toBe(0);
      expect(result.streakDays).toBe(0);
      expect(result.totalAttempts).toBe(0);
    });

    test("should calculate success rate correctly", async () => {
      // Create reflections where half mention fitness activities
      const reflections = [
        "Hari ini saya olahraga",
        "Kerja dari rumah saja",
        "Pergi ke gym",
        "Rapat dengan client",
      ];

      for (let i = 0; i < reflections.length; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        await db.reflection.create({
          data: {
            userId: testUserId,
            date: date,
            input: reflections[i]!,
            aiSummary: "AI summary",
            streakDay: 1,
          },
        });
      }

      const result = await habitAnalysisService.trackHabitSuccess(
        testUserId,
        "fitness"
      );

      expect(result.successRate).toBe(50); // 2 out of 4 reflections mention fitness
      expect(result.totalAttempts).toBe(4);
      expect(result.streakDays).toBeGreaterThan(0);
    });

    test("should track consecutive streaks correctly", async () => {
      // Create consecutive reflections with fitness activities
      const reflections = [
        "Olahraga pagi",
        "Gym sore hari",
        "Jogging pagi",
        "Rest day",
        "Workout lagi",
      ];

      for (let i = 0; i < reflections.length; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        await db.reflection.create({
          data: {
            userId: testUserId,
            date: date,
            input: reflections[reflections.length - 1 - i]!, // Reverse order for chronological
            aiSummary: "AI summary",
            streakDay: 1,
          },
        });
      }

      const result = await habitAnalysisService.trackHabitSuccess(
        testUserId,
        "fitness"
      );

      expect(result.streakDays).toBe(3); // Should find 3-day consecutive streak
      expect(result.successRate).toBe(80); // 4 out of 5 reflections
    });
  });

  describe("getHabitInsights", () => {
    test("should return default insights for user with no reflections", async () => {
      const insights = await habitAnalysisService.getHabitInsights(testUserId);

      expect(insights.topCategories).toHaveLength(0);
      expect(insights.suggestions).toHaveLength(3); // Default suggestions
      expect(insights.nextRecommendation).toContain("kebiasaan kecil");
    });

    test("should provide insights based on user's habit patterns", async () => {
      // Create reflections with multiple habit categories
      const reflections = [
        "Olahraga pagi dan meditasi",
        "Baca buku dan kerja project",
        "Gym dan belajar bahasa baru",
      ];

      for (let i = 0; i < reflections.length; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        await db.reflection.create({
          data: {
            userId: testUserId,
            date: date,
            input: reflections[i]!,
            aiSummary: "AI summary",
            streakDay: i + 1,
          },
        });
      }

      const insights = await habitAnalysisService.getHabitInsights(testUserId);

      expect(insights.topCategories.length).toBeGreaterThan(0);
      expect(insights.suggestions.length).toBeGreaterThan(0);
      expect(insights.successMetrics).toBeDefined();
      expect(insights.nextRecommendation).toBeDefined();
    });

    test("should calculate success metrics for categories", async () => {
      // Create reflections with fitness activities
      await db.reflection.create({
        data: {
          userId: testUserId,
          date: new Date(),
          input: "Olahraga pagi dan gym sore",
          aiSummary: "AI summary",
          streakDay: 1,
        },
      });

      const insights = await habitAnalysisService.getHabitInsights(testUserId);

      expect(insights.topCategories).toContain("fitness");
      expect(insights.successMetrics.fitness).toBeDefined();
      expect(insights.successMetrics.fitness).toBeGreaterThan(0);
    });

    test("should provide personalized next recommendation", async () => {
      // Create reflections that show strong fitness pattern
      for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        await db.reflection.create({
          data: {
            userId: testUserId,
            date: date,
            input: "Olahraga dan workout hari ini",
            aiSummary: "AI summary",
            streakDay: i + 1,
          },
        });
      }

      const insights = await habitAnalysisService.getHabitInsights(testUserId);

      expect(insights.nextRecommendation).toContain("fitness");
      expect(insights.nextRecommendation).toContain("konsistensi");
    });
  });

  describe("edge cases", () => {
    test("should handle non-existent user gracefully", async () => {
      const preferences = await habitAnalysisService.getUserHabitPreferences(
        "non-existent"
      );
      expect(preferences).toEqual([]);

      const suggestions =
        await habitAnalysisService.getHabitStackingSuggestions("non-existent");
      expect(suggestions).toHaveLength(3); // Should return default suggestions
    });

    test("should handle empty reflection input", async () => {
      await db.reflection.create({
        data: {
          userId: testUserId,
          date: new Date(),
          input: "",
          aiSummary: "AI summary",
          streakDay: 1,
        },
      });

      const result = await habitAnalysisService.analyzeHabitPatterns(
        testUserId,
        7
      );

      expect(result.identifiedHabits).toHaveLength(0);
      expect(result.categories).toHaveLength(0);
    });

    test("should handle special characters in reflection text", async () => {
      await db.reflection.create({
        data: {
          userId: testUserId,
          date: new Date(),
          input: "Olahraga!!! 💪 dan minum kopi ☕ pagi ini... 😊",
          aiSummary: "AI summary",
          streakDay: 1,
        },
      });

      const result = await habitAnalysisService.analyzeHabitPatterns(
        testUserId,
        7
      );

      expect(result.identifiedHabits).toContain("olahraga");
      expect(result.identifiedHabits).toContain("minum kopi");
    });
  });
});
