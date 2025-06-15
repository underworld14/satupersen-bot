import { PrismaClient } from "@prisma/client";
import type {
  HabitStackingSuggestion,
  HabitCategory,
} from "../types/bot-context.js";
import { generateContent } from "../utils/ai-client.js";

/**
 * Service for analyzing habits and generating habit stacking suggestions
 */
export class HabitAnalysisService {
  constructor(private db: PrismaClient) {}

  // Habit categories mapping for Indonesian context
  private readonly HABIT_CATEGORIES: Record<string, HabitCategory> = {
    olahraga: "fitness",
    gym: "fitness",
    lari: "fitness",
    jogging: "fitness",
    workout: "fitness",
    senam: "fitness",
    yoga: "fitness",
    meditasi: "mindfulness",
    mindfulness: "mindfulness",
    doa: "mindfulness",
    ibadah: "mindfulness",
    spiritual: "mindfulness",
    baca: "learning",
    membaca: "learning",
    belajar: "learning",
    kursus: "learning",
    study: "learning",
    kerja: "productivity",
    meeting: "productivity",
    presentation: "productivity",
    project: "productivity",
    tugas: "productivity",
    makan: "nutrition",
    sarapan: "nutrition",
    minum: "nutrition",
    vitamin: "nutrition",
    diet: "nutrition",
    tidur: "sleep",
    bangun: "morning_routine",
    pagi: "morning_routine",
    morning: "morning_routine",
    subuh: "morning_routine",
    keluarga: "social",
    teman: "social",
    pasangan: "social",
    sosial: "social",
  };

  // Common anchor habits in Indonesian context
  private readonly ANCHOR_HABITS = [
    "minum kopi pagi",
    "bangun tidur",
    "mandi pagi",
    "sarapan",
    "berangkat kerja",
    "pulang kerja",
    "makan siang",
    "makan malam",
    "sebelum tidur",
    "menggosok gigi",
    "buka handphone",
    "sholat",
    "doa",
    "masuk kamar",
    "duduk di meja kerja",
  ];

  /**
   * Analyze user's reflections to identify habit patterns
   */
  async analyzeHabitPatterns(
    userId: string,
    days: number = 7
  ): Promise<{
    identifiedHabits: string[];
    anchorHabits: string[];
    categories: HabitCategory[];
    consistency: Record<string, number>;
    recommendations: HabitStackingSuggestion[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const reflections = await this.db.reflection.findMany({
        where: {
          userId,
          date: { gte: startDate },
        },
        select: {
          input: true,
          date: true,
          streakDay: true,
        },
        orderBy: { date: "desc" },
      });

      if (reflections.length === 0) {
        return {
          identifiedHabits: [],
          anchorHabits: [],
          categories: [],
          consistency: {},
          recommendations: [],
        };
      }

      // Combine all reflection texts for analysis
      const combinedText = reflections.map((r) => r.input).join("\n\n");

      // Identify habits using keyword matching and AI analysis
      const identifiedHabits = this.extractHabitsFromText(combinedText);
      const anchorHabits = this.identifyAnchorHabits(identifiedHabits);
      const categories = this.categorizeHabits(identifiedHabits);
      const consistency = this.calculateHabitConsistency(reflections);

      // Generate AI-powered habit stacking recommendations
      const recommendations = await this.generateHabitStackingSuggestions(
        userId,
        identifiedHabits,
        anchorHabits,
        categories
      );

      return {
        identifiedHabits,
        anchorHabits,
        categories,
        consistency,
        recommendations,
      };
    } catch (error) {
      console.error("❌ Error analyzing habit patterns:", error);
      return {
        identifiedHabits: [],
        anchorHabits: [],
        categories: [],
        consistency: {},
        recommendations: [],
      };
    }
  }

  /**
   * Extract habits from reflection text using keyword matching
   */
  private extractHabitsFromText(text: string): string[] {
    const lowercaseText = text.toLowerCase();
    const identifiedHabits: string[] = [];

    // Common habit patterns in Indonesian
    const habitPatterns = [
      /(?:saya |aku |)(olahraga|gym|lari|jogging|workout|senam|yoga)/gi,
      /(?:saya |aku |)(meditasi|mindfulness|doa|ibadah)/gi,
      /(?:saya |aku |)(baca|membaca|belajar)/gi,
      /(?:saya |aku |)(makan|sarapan|minum)/gi,
      /(?:saya |aku |)(tidur|bangun)/gi,
      /(?:saya |aku |)(kerja|meeting|project)/gi,
      /(?:bangun |)(pagi|subuh|morning)/gi,
      /(?:minum |)(kopi|teh|air)/gi,
      /(?:menggosok |)(gigi)/gi,
      /(?:mandi |)(pagi|sore|malam)/gi,
    ];

    habitPatterns.forEach((pattern) => {
      const matches = lowercaseText.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const cleanHabit = match.replace(/^(saya |aku |)/, "").trim();
          if (!identifiedHabits.includes(cleanHabit)) {
            identifiedHabits.push(cleanHabit);
          }
        });
      }
    });

    return identifiedHabits;
  }

  /**
   * Identify anchor habits from the list of identified habits
   */
  private identifyAnchorHabits(identifiedHabits: string[]): string[] {
    const anchorHabits: string[] = [];

    this.ANCHOR_HABITS.forEach((anchor) => {
      const found = identifiedHabits.find(
        (habit) => habit.includes(anchor) || anchor.includes(habit)
      );
      if (found && !anchorHabits.includes(found)) {
        anchorHabits.push(found);
      }
    });

    return anchorHabits;
  }

  /**
   * Categorize habits into predefined categories
   */
  private categorizeHabits(habits: string[]): HabitCategory[] {
    const categories: Set<HabitCategory> = new Set();

    habits.forEach((habit) => {
      const lowercaseHabit = habit.toLowerCase();
      Object.entries(this.HABIT_CATEGORIES).forEach(([keyword, category]) => {
        if (lowercaseHabit.includes(keyword)) {
          categories.add(category);
        }
      });
    });

    return Array.from(categories);
  }

  /**
   * Calculate habit consistency based on reflection frequency
   */
  private calculateHabitConsistency(
    reflections: any[]
  ): Record<string, number> {
    const consistency: Record<string, number> = {};
    const totalDays = reflections.length;

    if (totalDays === 0) return consistency;

    // Simple consistency calculation based on reflection streak
    const avgStreakDay =
      reflections.reduce((sum, r) => sum + r.streakDay, 0) / totalDays;

    consistency["reflection"] = Math.round((avgStreakDay / totalDays) * 100);
    consistency["overall"] = Math.round((totalDays / 7) * 100); // Assuming 7-day analysis period

    return consistency;
  }

  /**
   * Generate AI-powered habit stacking suggestions
   */
  async generateHabitStackingSuggestions(
    userId: string,
    identifiedHabits: string[],
    anchorHabits: string[],
    categories: HabitCategory[]
  ): Promise<HabitStackingSuggestion[]> {
    try {
      if (anchorHabits.length === 0) {
        return this.getDefaultHabitStacks();
      }

      // Get user preferences
      const userPrefs = await this.getUserHabitPreferences(userId);

      // Create AI prompt for habit stacking
      const prompt = this.createHabitStackingPrompt(
        identifiedHabits,
        anchorHabits,
        categories,
        userPrefs
      );

      const aiResponse = await generateContent(prompt);
      const suggestions = this.parseHabitStackingSuggestions(aiResponse);

      // Save suggestions to database for future reference
      await this.saveHabitStackingSuggestions(userId, suggestions);

      return suggestions;
    } catch (error) {
      console.error("❌ Error generating habit stacking suggestions:", error);
      return this.getDefaultHabitStacks();
    }
  }

  /**
   * Create AI prompt for habit stacking suggestions
   */
  private createHabitStackingPrompt(
    identifiedHabits: string[],
    anchorHabits: string[],
    categories: HabitCategory[],
    userPrefs: string[]
  ): string {
    return `
Kamu adalah ahli pembentukan kebiasaan yang membantu pengguna membangun habit stacking.

Data pengguna:
- Kebiasaan yang teridentifikasi: ${identifiedHabits.join(", ")}
- Anchor habits: ${anchorHabits.join(", ")}
- Kategori kebiasaan: ${categories.join(", ")}
- Preferensi pengguna: ${userPrefs.join(", ")}

Berikan 3 saran habit stacking dalam format JSON.
PENTING: Respons HARUS berupa string JSON mentah, tanpa teks penjelasan tambahan, dan TIDAK di dalam format markdown code block (\`\`\`json). Langsung mulai dengan karakter '['.

Contoh format JSON:
[
  {
    "id": "1",
    "anchorHabit": "kebiasaan yang sudah ada",
    "newHabit": "kebiasaan baru yang disarankan",
    "suggestion": "penjelasan lengkap habit stacking (2-3 kalimat)",
    "confidence": 85,
    "category": "fitness"
  }
]

Kriteria saran:
1. Gunakan anchor habit yang sudah ada
2. Saran kebiasaan baru harus realistis dan mudah dilakukan (2-5 menit)
3. Sesuaikan dengan preferensi dan pola hidup pengguna
4. Berikan confidence score 1-100
5. Gunakan bahasa Indonesia yang natural dan motivatif
6. Fokus pada kebiasaan yang mendukung well-being dan produktivitas

Contoh yang baik:
"Setelah minum kopi pagi" + "tulis 3 hal yang disyukuri (2 menit)"
"Setelah menggosok gigi" + "lakukan 10 push-up"
"Setelah duduk di meja kerja" + "atur 3 prioritas hari ini"
`;
  }

  /**
   * Parse AI response to extract habit stacking suggestions
   */
  private parseHabitStackingSuggestions(
    aiResponse: string
  ): HabitStackingSuggestion[] {
    try {
      let jsonString = aiResponse;

      // Handle markdown code block, if the AI still includes it
      const markdownMatch = jsonString.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (markdownMatch && markdownMatch[1]) {
        jsonString = markdownMatch[1];
      }

      // Find the start of the JSON array
      const startIndex = jsonString.indexOf("[");
      if (startIndex === -1) {
        throw new Error("No JSON array start found in AI response");
      }
      jsonString = jsonString.substring(startIndex);

      // Find the end of the JSON array
      const endIndex = jsonString.lastIndexOf("]");
      if (endIndex === -1) {
        throw new Error("No JSON array end found in AI response");
      }
      jsonString = jsonString.substring(0, endIndex + 1);

      const suggestions = JSON.parse(jsonString) as HabitStackingSuggestion[];

      // Validate and clean suggestions
      return suggestions
        .filter((s) => s.anchorHabit && s.newHabit && s.suggestion)
        .map((s) => ({
          ...s,
          confidence: Math.max(1, Math.min(100, s.confidence || 70)),
          category: s.category || "productivity",
        }))
        .slice(0, 3); // Limit to 3 suggestions
    } catch (error) {
      console.warn(
        "⚠️ Failed to parse AI habit suggestions:",
        error,
        "\nRaw response:",
        aiResponse
      );
      return this.getDefaultHabitStacks();
    }
  }

  /**
   * Get default habit stacking suggestions
   */
  private getDefaultHabitStacks(): HabitStackingSuggestion[] {
    return [
      {
        id: "default-1",
        anchorHabit: "bangun pagi",
        newHabit: "minum air putih 1 gelas",
        suggestion:
          "Setelah bangun pagi, langsung minum air putih untuk hidrasi optimal. Kebiasaan sederhana ini membantu memulai hari dengan energi dan detoksifikasi alami.",
        confidence: 90,
        category: "morning_routine",
      },
      {
        id: "default-2",
        anchorHabit: "sebelum tidur",
        newHabit: "tulis 1 hal yang disyukuri",
        suggestion:
          "Sebelum tidur, tuliskan satu hal yang kamu syukuri hari ini. Ini membantu menciptakan mindset positif dan tidur yang lebih berkualitas.",
        confidence: 85,
        category: "mindfulness",
      },
      {
        id: "default-3",
        anchorHabit: "setelah makan",
        newHabit: "jalan kaki 5 menit",
        suggestion:
          "Setelah makan, luangkan 5 menit untuk jalan kaki ringan. Ini membantu pencernaan dan memberikan break mental yang menyegarkan.",
        confidence: 80,
        category: "fitness",
      },
    ];
  }

  /**
   * Get user's habit preferences
   */
  async getUserHabitPreferences(userId: string): Promise<string[]> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { habitPrefs: true },
      });

      return user?.habitPrefs || [];
    } catch (error) {
      console.error("❌ Error getting user preferences:", error);
      return [];
    }
  }

  /**
   * Update user's habit preferences based on feedback
   */
  async updateUserPreferences(
    userId: string,
    category: HabitCategory,
    liked: boolean
  ): Promise<void> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { habitPrefs: true },
      });

      if (!user) return;

      let preferences = user.habitPrefs || [];

      if (liked && !preferences.includes(category)) {
        preferences.push(category);
      } else if (!liked && preferences.includes(category)) {
        preferences = preferences.filter((p) => p !== category);
      }

      await this.db.user.update({
        where: { id: userId },
        data: { habitPrefs: preferences },
      });

      console.log(
        `📝 Updated preferences for user ${userId}: ${preferences.join(", ")}`
      );
    } catch (error) {
      console.error("❌ Error updating user preferences:", error);
    }
  }

  /**
   * Save habit stacking suggestions for tracking
   */
  private async saveHabitStackingSuggestions(
    userId: string,
    suggestions: HabitStackingSuggestion[]
  ): Promise<void> {
    try {
      // Save the best suggestion to the latest reflection
      if (suggestions.length > 0 && suggestions[0]) {
        const latestReflection = await this.db.reflection.findFirst({
          where: { userId },
          orderBy: { date: "desc" },
        });

        if (latestReflection) {
          await this.db.reflection.update({
            where: { id: latestReflection.id },
            data: {
              habitStackingSuggestion: suggestions[0].suggestion,
            },
          });
        }
      }
    } catch (error) {
      console.warn("⚠️ Failed to save habit suggestions:", error);
    }
  }

  /**
   * Get habit stacking suggestions for a user
   */
  async getHabitStackingSuggestions(
    userId: string
  ): Promise<HabitStackingSuggestion[]> {
    try {
      const analysis = await this.analyzeHabitPatterns(userId, 7);
      if (analysis.recommendations.length === 0) {
        // If no specific recommendations, return defaults
        return this.getDefaultHabitStacks();
      }
      return analysis.recommendations;
    } catch (error) {
      console.error("❌ Error getting habit suggestions:", error);
      return this.getDefaultHabitStacks();
    }
  }

  /**
   * Track habit success based on user reflections
   */
  async trackHabitSuccess(
    userId: string,
    habitCategory: HabitCategory
  ): Promise<{
    successRate: number;
    streakDays: number;
    totalAttempts: number;
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const reflections = await this.db.reflection.findMany({
        where: {
          userId,
          date: { gte: thirtyDaysAgo },
        },
        select: {
          input: true,
          date: true,
          streakDay: true,
        },
        orderBy: { date: "asc" },
      });

      // Simple tracking based on keyword presence in reflections
      const categoryKeywords = Object.entries(this.HABIT_CATEGORIES)
        .filter(([_, cat]) => cat === habitCategory)
        .map(([keyword, _]) => keyword);

      let successfulDays = 0;
      let currentStreak = 0;
      let maxStreak = 0;

      reflections.forEach((reflection) => {
        const hasHabit = categoryKeywords.some((keyword) =>
          reflection.input.toLowerCase().includes(keyword)
        );

        if (hasHabit) {
          successfulDays++;
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      const successRate =
        reflections.length > 0
          ? (successfulDays / reflections.length) * 100
          : 0;

      return {
        successRate: Math.round(successRate),
        streakDays: maxStreak,
        totalAttempts: reflections.length,
      };
    } catch (error) {
      console.error("❌ Error tracking habit success:", error);
      return {
        successRate: 0,
        streakDays: 0,
        totalAttempts: 0,
      };
    }
  }

  /**
   * Get habit insights and recommendations
   */
  async getHabitInsights(userId: string): Promise<{
    topCategories: HabitCategory[];
    suggestions: HabitStackingSuggestion[];
    successMetrics: Partial<Record<HabitCategory, number>>;
    nextRecommendation: string;
  }> {
    try {
      const analysis = await this.analyzeHabitPatterns(userId, 30);
      const suggestions =
        analysis.recommendations.length > 0
          ? analysis.recommendations
          : this.getDefaultHabitStacks();

      // Get success metrics for top categories
      const successMetrics: Partial<Record<HabitCategory, number>> = {};
      for (const category of analysis.categories) {
        const { successRate } = await this.trackHabitSuccess(userId, category);
        successMetrics[category] = successRate;
      }

      // Generate a personalized next recommendation
      let nextRecommendation =
        "Fokus pada kebiasaan kecil yang paling berdampak untukmu. Coba salah satu saran di atas!";
      if (analysis.categories.length > 0) {
        const topCategory = analysis.categories[0]!;
        nextRecommendation = `Kamu menunjukkan kemajuan di bidang ${topCategory}. Lanjutkan! Coba tingkatkan konsistensi atau tambah tantangan kecil.`;
      }

      return {
        topCategories: analysis.categories,
        suggestions,
        successMetrics,
        nextRecommendation,
      };
    } catch (error) {
      console.error("❌ Error getting habit insights:", error);
      return {
        topCategories: [],
        suggestions: this.getDefaultHabitStacks(),
        successMetrics: {},
        nextRecommendation:
          "Mulailah dengan kebiasaan kecil. Pilih satu dari daftar di atas untuk dicoba besok.",
      };
    }
  }
}
