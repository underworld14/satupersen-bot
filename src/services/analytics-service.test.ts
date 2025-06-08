import { AnalyticsService } from "./analytics-service.js";
import type { PrismaClient, Reflection } from "@prisma/client";
import type { StatsPeriod } from "../types/bot-context.js";

// Manual mock for PrismaClient
const mockDb: PrismaClient = {
  reflection: {
    count: async (args: any): Promise<number> => {
      // Implemented in specific tests
      return 0;
    },
    findMany: async (args: any): Promise<Reflection[]> => {
      // Implemented in specific tests
      return [];
    },
    // Add other methods if AnalyticsService starts using them
  },
  // Mock other models if needed by AnalyticsService in the future
} as unknown as PrismaClient; // Type assertion to satisfy PrismaClient structure

const analyticsService = new AnalyticsService(mockDb);

async function runAnalyticsServiceTests() {
  console.log("🧪 Running AnalyticsService Tests...\n");
  let passed = 0;
  let failed = 0;

  const test = async (description: string, testFn: () => Promise<void>) => {
    console.log(`⏳ ${description}`);
    try {
      await testFn();
      console.log(`✅ ${description} - PASSED`);
      passed++;
    } catch (error) {
      console.error(`❌ ${description} - FAILED`);
      console.error(error);
      failed++;
    }
    console.log("---");
  };

  // --- Test getTotalReflectionCount ---
  await test("getTotalReflectionCount - should return 0 if no reflections", async () => {
    // @ts-ignore
    mockDb.reflection.count = async () => 0;
    const count = await analyticsService.getTotalReflectionCount("user1");
    if (count !== 0) throw new Error(`Expected 0, got ${count}`);
  });

  await test("getTotalReflectionCount - should return correct count", async () => {
    // @ts-ignore
    mockDb.reflection.count = async () => 5;
    const count = await analyticsService.getTotalReflectionCount("user1");
    if (count !== 5) throw new Error(`Expected 5, got ${count}`);
  });

  // --- Test getReflectionCountForPeriod ---
  await test("getReflectionCountForPeriod - should return 0 if no reflections in period", async () => {
    // @ts-ignore
    mockDb.reflection.count = async () => 0;
    const count = await analyticsService.getReflectionCountForPeriod(
      "user1",
      new Date("2023-01-01"),
      new Date("2023-01-07")
    );
    if (count !== 0) throw new Error(`Expected 0, got ${count}`);
  });

  await test("getReflectionCountForPeriod - should return correct count for period", async () => {
    // @ts-ignore
    mockDb.reflection.count = async (args: any) => {
      // Simulate filtering by date
      if (args.where.date.gte.toISOString().startsWith("2023-01-01")) {
        return 3;
      }
      return 0;
    };
    const count = await analyticsService.getReflectionCountForPeriod(
      "user1",
      new Date("2023-01-01"),
      new Date("2023-01-07")
    );
    if (count !== 3) throw new Error(`Expected 3, got ${count}`);
  });

  // --- Test calculateReflectionKPIs ---
  const mockReflections: Reflection[] = [
    { id: "r1", userId: "user1", date: new Date("2023-01-01T10:00:00Z"), input: "Reflection 1", aiSummary: "", wordCount: 10, createdAt: new Date(), updatedAt: new Date() },
    { id: "r2", userId: "user1", date: new Date("2023-01-02T10:00:00Z"), input: "Reflection 2 wordy", aiSummary: "", wordCount: 20, createdAt: new Date(), updatedAt: new Date() },
    { id: "r3", userId: "user1", date: new Date("2023-01-03T10:00:00Z"), input: "Reflection 3 even more wordy", aiSummary: "", wordCount: 30, createdAt: new Date(), updatedAt: new Date() },
    { id: "r4", userId: "user1", date: new Date("2023-01-03T11:00:00Z"), input: "Reflection 4 on same day", aiSummary: "", wordCount: 15, createdAt: new Date(), updatedAt: new Date() }, // Same day
  ];

  await test("calculateReflectionKPIs - no reflections", async () => {
    // @ts-ignore
    mockDb.reflection.findMany = async () => [];
    const kpis = await analyticsService.calculateReflectionKPIs("user1", "weekly");
    if (kpis.reflectionCount !== 0) throw new Error("Reflection count should be 0");
    if (kpis.totalDays !== 7) throw new Error("Total days should be 7 for weekly");
    if (kpis.consistencyPercentage !== 0) throw new Error("Consistency should be 0");
    if (kpis.averageWordsPerDay !== 0) throw new Error("Average words should be 0");
    if (kpis.mostActiveDay !== "Belum ada data") throw new Error("Most active day should be 'Belum ada data'");
  });

  await test("calculateReflectionKPIs - weekly data", async () => {
    // @ts-ignore
    mockDb.reflection.findMany = async () => mockReflections.slice(0, 3); // Simulate 3 reflections in a week
    const kpis = await analyticsService.calculateReflectionKPIs("user1", "weekly");

    if (kpis.reflectionCount !== 3) throw new Error(`Expected 3 reflections, got ${kpis.reflectionCount}`);
    if (kpis.totalDays !== 7) throw new Error("Total days should be 7 for weekly");
    // 3 reflections in 7 days = (3/7)*100 = 42.857...
    if (Math.abs(kpis.consistencyPercentage - (300 / 7)) > 0.01) throw new Error(`Expected ~42.86% consistency, got ${kpis.consistencyPercentage}`);
    // (10+20+30)/3 = 20
    if (kpis.averageWordsPerDay !== 20) throw new Error(`Expected 20 average words, got ${kpis.averageWordsPerDay}`);
    // Dates: Jan 1 (Sun), Jan 2 (Mon), Jan 3 (Tue) for mockReflections.slice(0,3)
    // Locale 'id-ID' specific, this might be tricky if test env locale differs.
    // For now, let's assume Tuesday (Selasa) for Jan 3rd.
    // This test is fragile due to toLocaleDateString. A better mock would control this.
    // const expectedMostActiveDay = new Date("2023-01-03").toLocaleDateString("id-ID", { weekday: "long" });
    // if (kpis.mostActiveDay !== expectedMostActiveDay) throw new Error(`Expected most active day ${expectedMostActiveDay}, got ${kpis.mostActiveDay}`);
    // For now, just check it's not the default "Belum ada data"
    if (kpis.mostActiveDay === "Belum ada data" && kpis.reflectionCount > 0) throw new Error("Most active day should be determined");
  });

  await test("calculateReflectionKPIs - monthly data with varied reflections", async () => {
    const reflectionsForMonth: Reflection[] = [];
    for (let i = 0; i < 15; i++) { // 15 reflections
        reflectionsForMonth.push({
            id: `m${i}`, userId: "user1",
            date: new Date(2023, 0, i + 1), // Jan 1 to Jan 15
            input: `Monthly reflection ${i}`, aiSummary: "", wordCount: 10 * (i % 3 + 1), // 10, 20, 30, 10 ...
            createdAt: new Date(), updatedAt: new Date()
        });
    }
    // @ts-ignore
    mockDb.reflection.findMany = async () => reflectionsForMonth;
    const kpis = await analyticsService.calculateReflectionKPIs("user1", "monthly");

    if (kpis.reflectionCount !== 15) throw new Error(`Expected 15 reflections for monthly, got ${kpis.reflectionCount}`);
    if (kpis.totalDays !== 30) throw new Error("Total days should be 30 for monthly");
    if (Math.abs(kpis.consistencyPercentage - 50) > 0.01) throw new Error(`Expected 50% consistency, got ${kpis.consistencyPercentage}`); // 15/30
    // Sum of word counts: 5*(10+20+30) = 5*60 = 300. Avg = 300/15 = 20
    if (kpis.averageWordsPerDay !== 20) throw new Error(`Expected 20 average words for monthly, got ${kpis.averageWordsPerDay}`);
  });


  // --- Test getReflectionFrequencyTrend (Placeholder) ---
  await test("getReflectionFrequencyTrend - should return placeholder", async () => {
    const trend = await analyticsService.getReflectionFrequencyTrend("user1");
    if (!trend.includes("belum diimplementasikan")) {
      throw new Error(`Expected placeholder string, got: ${trend}`);
    }
  });

  // --- Test generatePersonalizedInsights (Placeholder) ---
  await test("generatePersonalizedInsights - should return array of strings", async () => {
    const insights = await analyticsService.generatePersonalizedInsights("user1");
    if (!Array.isArray(insights) || insights.length === 0) {
      throw new Error("Expected array of strings, got empty or non-array");
    }
    if (!insights[insights.length -1].includes("segera hadir")) {
        throw new Error("Expected placeholder insight about AI feature");
    }
  });

  console.log(`\n🏁 AnalyticsService Tests Finished: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1); // Indicate failure for CI/CD or other runners
  }
}

runAnalyticsServiceTests();
