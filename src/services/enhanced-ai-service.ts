import { PrismaClient } from "@prisma/client";
import type {
  StreakData,
  MilestoneData,
  HabitCategory,
  BotContext,
} from "../types/bot-context.js";
import { generateContent } from "../utils/ai-client.js";
import {
  generateHabitAwareReflectionPrompt,
  generateMilestoneCelebrationPrompt,
  generateHabitStackingPrompt,
  generateProgressMotivationPrompt,
  generateStreakRecoveryPrompt,
  generateHabitPatternAnalysisPrompt,
  type HabitAwarePromptData,
} from "../utils/ai-prompt-templates.js";

/**
 * Enhanced AI Service with Habit Psychology Integration
 * Centralizes all intelligent AI interactions with habit awareness
 */
export class EnhancedAIService {
  constructor(private db: PrismaClient) {}

  /**
   * Generate habit-aware reflection analysis
   */
  async generateHabitAwareReflection(
    userId: string,
    reflectionText: string,
    context: {
      streakData?: StreakData;
      recentMilestones?: MilestoneData[];
      habitPatterns?: string[];
      progressLevel?: string;
      cumulativeProgress?: number;
      habitMaturity?: number;
    }
  ): Promise<{
    analysis: string;
    moodScore: number | null;
    insights: string[];
    recommendations: string[];
  }> {
    try {
      // Get previous reflections for context
      const previousReflections = await this.db.reflection.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 2,
        select: { input: true },
      });

      const promptData: HabitAwarePromptData = {
        hari_ini: reflectionText,
        kemarin: previousReflections[0]?.input || null,
        dua_hari_lalu: previousReflections[1]?.input || null,
        ...context,
      };

      const prompt = generateHabitAwareReflectionPrompt(promptData);
      const aiResponse = await generateContent(prompt);

      // Extract mood score
      let moodScore: number | null = null;
      const moodScoreRegex = /moodScore:\s*(\d+)/i;
      const match = aiResponse.match(moodScoreRegex);

      if (match && match[1]) {
        const score = parseInt(match[1], 10);
        if (score >= 1 && score <= 100) {
          moodScore = score;
        }
      }

      const cleanedAnalysis = aiResponse.replace(moodScoreRegex, "").trim();

      return {
        analysis: cleanedAnalysis,
        moodScore,
        insights: this.extractInsights(cleanedAnalysis),
        recommendations: this.extractRecommendations(cleanedAnalysis),
      };
    } catch (error) {
      console.error("❌ Error generating habit-aware reflection:", error);
      throw new Error("Failed to generate habit-aware analysis");
    }
  }

  /**
   * Generate milestone celebration message
   */
  async generateMilestoneCelebration(
    userId: string,
    milestone: MilestoneData
  ): Promise<string> {
    try {
      // Get user context for celebration
      const userData = await this.getUserContextForCelebration(userId);
      const prompt = generateMilestoneCelebrationPrompt(milestone, userData);

      const celebration = await generateContent(prompt);

      console.log(
        `🎉 Generated milestone celebration for ${milestone.type} milestone`
      );
      return celebration;
    } catch (error) {
      console.error("❌ Error generating milestone celebration:", error);
      return this.getFallbackCelebration(milestone);
    }
  }

  /**
   * Generate adaptive habit stacking suggestions
   */
  async generateAdaptiveHabitSuggestions(
    userId: string,
    options: {
      anchorHabits?: string[];
      userPreferences?: string[];
      progressLevel?: string;
      contextualReflections?: string[];
    } = {}
  ): Promise<{
    suggestions: Array<{
      title: string;
      anchorHabit: string;
      newHabit: string;
      implementation: string;
      reasoning: string;
      confidence: number;
    }>;
    progressFeedback: string;
    nextStepAdvice: string;
  }> {
    try {
      const {
        anchorHabits = [],
        userPreferences = [],
        progressLevel = "Pemula Refleksi",
        contextualReflections = [],
      } = options;

      const prompt = generateHabitStackingPrompt(
        anchorHabits,
        userPreferences,
        progressLevel,
        contextualReflections
      );

      const aiResponse = await generateContent(prompt);
      const parsed = this.parseHabitStackingResponse(aiResponse);

      console.log(
        `💡 Generated ${parsed.suggestions.length} habit suggestions for user ${userId}`
      );
      return parsed;
    } catch (error) {
      console.error("❌ Error generating habit suggestions:", error);
      return this.getFallbackHabitSuggestions();
    }
  }

  /**
   * Generate progress-aware motivational feedback
   */
  async generateProgressMotivation(
    userId: string,
    reflectionText: string,
    progressData: {
      level: string;
      cumulativeProgress: number;
      habitMaturity: number;
      weeklyImprovement: number;
      streakData: StreakData;
      avgMoodScore?: number;
    }
  ): Promise<string> {
    try {
      const prompt = generateProgressMotivationPrompt(
        progressData,
        reflectionText
      );
      const motivation = await generateContent(prompt);

      console.log(
        `📈 Generated progress motivation for level ${progressData.level}`
      );
      return motivation;
    } catch (error) {
      console.error("❌ Error generating progress motivation:", error);
      return this.getFallbackProgressMotivation(progressData.level);
    }
  }

  /**
   * Generate streak recovery motivation
   */
  async generateStreakRecovery(
    userId: string,
    streakData: StreakData,
    missedDays: number,
    reflectionText: string
  ): Promise<string> {
    try {
      const prompt = generateStreakRecoveryPrompt(
        streakData,
        missedDays,
        reflectionText
      );
      const recovery = await generateContent(prompt);

      console.log(
        `🔄 Generated streak recovery motivation for ${missedDays} missed days`
      );
      return recovery;
    } catch (error) {
      console.error("❌ Error generating streak recovery:", error);
      return this.getFallbackStreakRecovery(missedDays);
    }
  }

  /**
   * Analyze habit patterns using AI
   */
  async analyzeHabitPatterns(
    userId: string,
    days: number = 14
  ): Promise<{
    identifiedHabits: Array<{
      habit: string;
      frequency: string;
      timing: string;
      consistency: number;
      category: string;
    }>;
    triggers: {
      positive: string[];
      negative: string[];
    };
    recommendations: Array<{
      type: string;
      suggestion: string;
      reasoning: string;
    }>;
    insights: string;
  }> {
    try {
      // Get recent reflections
      const reflections = await this.db.reflection.findMany({
        where: {
          userId,
          date: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { date: "desc" },
        select: { input: true },
      });

      if (reflections.length === 0) {
        return this.getEmptyHabitAnalysis();
      }

      const reflectionTexts = reflections.map((r) => r.input);
      const prompt = generateHabitPatternAnalysisPrompt(
        reflectionTexts,
        userId
      );
      const aiResponse = await generateContent(prompt);

      const analysis = this.parseHabitAnalysisResponse(aiResponse);

      console.log(
        `🔍 Analyzed habit patterns for ${reflections.length} reflections`
      );
      return analysis;
    } catch (error) {
      console.error("❌ Error analyzing habit patterns:", error);
      return this.getEmptyHabitAnalysis();
    }
  }

  /**
   * Get adaptive AI model configuration based on user context
   */
  getAdaptiveAIConfig(context: {
    userLevel?: string;
    emotionalState?: string;
    timeOfDay?: string;
  }) {
    const { userLevel, emotionalState, timeOfDay } = context;

    let temperature = 0.7;
    let maxTokens = 280;

    // Adjust for user level
    if (userLevel === "Master Transformer") {
      temperature = 0.8; // More creative for advanced users
      maxTokens = 320;
    } else if (userLevel === "Pemula Refleksi") {
      temperature = 0.6; // More structured for beginners
    }

    // Adjust for emotional state
    if (emotionalState === "stressed" || emotionalState === "sad") {
      temperature = 0.5; // More empathetic and structured
      maxTokens = 300; // Allow more space for support
    }

    // Adjust for time of day
    if (timeOfDay === "morning") {
      temperature = 0.8; // More energetic
    } else if (timeOfDay === "evening") {
      temperature = 0.6; // More calming
    }

    return {
      temperature,
      maxOutputTokens: maxTokens,
      candidateCount: 1,
    };
  }

  /**
   * Private helper methods
   */

  private async getUserContextForCelebration(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        habitPrefs: true,
        reflections: {
          take: 10,
          orderBy: { date: "desc" },
          select: { moodScore: true },
        },
      },
    });

    if (!user) {
      return {
        totalReflections: 0,
        streakData: { currentStreak: 0, longestStreak: 0 } as StreakData,
      };
    }

    const avgMoodScore =
      user.reflections.length > 0
        ? user.reflections
            .filter((r) => r.moodScore)
            .reduce((sum, r) => sum + (r.moodScore || 0), 0) /
          user.reflections.filter((r) => r.moodScore).length
        : undefined;

    return {
      totalReflections: user.reflections.length,
      avgMoodScore,
      habitPatterns: user.habitPrefs,
      streakData: {
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
      } as StreakData,
    };
  }

  private extractInsights(analysis: string): string[] {
    // Simple extraction - look for insight patterns
    const insights: string[] = [];
    const insightPatterns = [
      /insight[:\s]+([^.!?]+[.!?])/gi,
      /terlihat bahwa ([^.!?]+[.!?])/gi,
      /pola yang muncul ([^.!?]+[.!?])/gi,
    ];

    insightPatterns.forEach((pattern) => {
      const matches = analysis.match(pattern);
      if (matches) {
        insights.push(...matches);
      }
    });

    return insights.slice(0, 3); // Limit to 3 insights
  }

  private extractRecommendations(analysis: string): string[] {
    // Simple extraction - look for recommendation patterns
    const recommendations: string[] = [];
    const recPatterns = [
      /saran[:\s]+([^.!?]+[.!?])/gi,
      /coba ([^.!?]+[.!?])/gi,
      /sebaiknya ([^.!?]+[.!?])/gi,
    ];

    recPatterns.forEach((pattern) => {
      const matches = analysis.match(pattern);
      if (matches) {
        recommendations.push(...matches);
      }
    });

    return recommendations.slice(0, 2); // Limit to 2 recommendations
  }

  private parseHabitStackingResponse(response: string) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn("⚠️ Failed to parse habit stacking JSON");
    }

    return this.getFallbackHabitSuggestions();
  }

  private parseHabitAnalysisResponse(response: string) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn("⚠️ Failed to parse habit analysis JSON");
    }

    return this.getEmptyHabitAnalysis();
  }

  private getFallbackCelebration(milestone: MilestoneData): string {
    return (
      `🎉 **SELAMAT!** 🎉\n\n` +
      `Kamu telah mencapai milestone ${milestone.title} ${milestone.badge}!\n\n` +
      `${milestone.description}\n\n` +
      `Ini adalah pencapaian yang luar biasa! Tetap semangat melanjutkan perjalanan transformasi kamu! 💪`
    );
  }

  private getFallbackHabitSuggestions() {
    return {
      suggestions: [
        {
          title: "Hidrasi Pagi",
          anchorHabit: "bangun tidur",
          newHabit: "minum 1 gelas air",
          implementation:
            "After I wake up, I will drink 1 glass of water for 30 seconds",
          reasoning:
            "Hidrasi pagi membantu mengaktifkan metabolisme dan memberi energi",
          confidence: 90,
        },
      ],
      progressFeedback: "Mulai dengan kebiasaan kecil yang mudah dilakukan",
      nextStepAdvice: "Fokus pada konsistensi sebelum menambah kebiasaan baru",
    };
  }

  private getFallbackProgressMotivation(level: string): string {
    return (
      `💪 **Progress Update untuk ${level}**\n\n` +
      `Setiap langkah kecil yang kamu ambil hari ini adalah investasi untuk masa depan yang lebih baik. ` +
      `Seperti kata James Clear: "Progress, not perfection." Tetap konsisten! 🌟`
    );
  }

  private getFallbackStreakRecovery(missedDays: number): string {
    return (
      `🔄 **Comeback Time!**\n\n` +
      `Tidak apa-apa terlewat ${missedDays} hari. Yang penting adalah kamu kembali hari ini! ` +
      `Setiap master pernah gagal, yang membedakan adalah mereka yang bangkit kembali. ` +
      `Mari mulai fresh streak baru! 💪`
    );
  }

  private getEmptyHabitAnalysis() {
    return {
      identifiedHabits: [],
      triggers: { positive: [], negative: [] },
      recommendations: [],
      insights:
        "Belum cukup data untuk analisis mendalam. Lanjutkan refleksi harian!",
    };
  }
}
