import type {
  StreakData,
  MilestoneData,
  HabitCategory,
} from "../types/bot-context";

/**
 * Enhanced AI Prompt Templates with Habit Psychology Integration
 */

export interface HabitAwarePromptData {
  hari_ini: string;
  kemarin?: string | null;
  dua_hari_lalu?: string | null;
  // Habit psychology context
  streakData?: StreakData;
  recentMilestones?: MilestoneData[];
  habitPatterns?: string[];
  progressLevel?: string;
  cumulativeProgress?: number;
  habitMaturity?: number;
  avgMoodScore?: number;
  moodTrend?: string;
}

/**
 * Generate enhanced habit-aware reflection prompt
 */
export function generateHabitAwareReflectionPrompt(
  data: HabitAwarePromptData
): string {
  const {
    hari_ini,
    kemarin,
    dua_hari_lalu,
    streakData,
    recentMilestones,
    habitPatterns,
    progressLevel,
    cumulativeProgress,
    habitMaturity,
    avgMoodScore,
    moodTrend,
  } = data;

  // Build habit context
  let habitContext = "";

  if (streakData) {
    habitContext += `\n🔥 **Streak Status**: ${streakData.currentStreak} hari berturut-turut (terpanjang: ${streakData.longestStreak} hari)`;

    if (!streakData.streakMaintained) {
      habitContext += ` - Streak baru dimulai, semangat membangun konsistensi!`;
    } else if (streakData.currentStreak >= 21) {
      habitContext += ` - Streak fantastis! Kebiasaan mulai terbentuk kuat.`;
    } else if (streakData.currentStreak >= 7) {
      habitContext += ` - Momentum bagus terbentuk! Lanjutkan konsistensi.`;
    } else if (streakData.currentStreak >= 3) {
      habitContext += ` - Awal yang solid! Setiap hari membawa kamu lebih dekat ke kebiasaan yang kuat.`;
    }
  }

  if (recentMilestones && recentMilestones.length > 0) {
    const milestone = recentMilestones[0];
    if (milestone) {
      habitContext += `\n🏆 **Milestone Terbaru**: ${milestone.title} (${milestone.badge}) - ${milestone.description}`;
    }
  }

  if (progressLevel && cumulativeProgress) {
    habitContext += `\n📊 **Progress Level**: ${progressLevel} - ${Math.round(
      cumulativeProgress
    )}% progress "1% better daily"`;
  }

  if (habitMaturity && habitMaturity > 0) {
    habitContext += `\n🏗️ **Habit Maturity**: ${Math.round(
      habitMaturity
    )}% progress menuju otomatisasi kebiasaan (66 hari)`;
  }

  if (habitPatterns && habitPatterns.length > 0) {
    habitContext += `\n🎯 **Pola Kebiasaan Terdeteksi**: ${habitPatterns
      .slice(0, 3)
      .join(", ")}`;
  }

  if (avgMoodScore && moodTrend) {
    habitContext += `\n😊 **Mood Trend**: Rata-rata ${avgMoodScore}/100, ${moodTrend}`;
  }

  const prompt = `Kamu adalah asisten refleksi harian yang membantu berkembang 1% setiap hari dengan pengetahuan mendalam tentang psikologi kebiasaan, literatur motivasi, dan strategi pengembangan diri.

Refleksi 3 hari:

📅 Dua Hari Lalu: ${dua_hari_lalu || "Tidak ada refleksi"}
📅 Kemarin: ${kemarin || "Tidak ada refleksi"}
📅 Hari Ini: ${hari_ini}
${habitContext}

ATURAN RESPONS HABIT-AWARE:
- MAKSIMAL 280 kata total
- Integrasikan data habit psychology dalam analisis
- Berikan feedback yang mempertimbangkan streak, milestone, dan progress level
- Jika streak tinggi, berikan apresiasi khusus dan motivasi untuk mempertahankan
- Jika streak baru/terputus, berikan dorongan positif dan strategi restart yang terinspirasi dari "Atomic Habits"
- Jika ada milestone baru, rayakan pencapaian dengan antusias
- Sesuaikan feedback dengan progress level pengguna (Pemula vs Master Transformer)
- Sertakan saran habit stacking jika melihat pola kebiasaan yang bisa dikembangkan
- Referensikan literatur habit psychology: "Atomic Habits", "The Power of Habit", "Tiny Habits", "The Compound Effect"
- Gunakan prinsip psikologi kebiasaan: habit loop, cue-routine-reward, identity-based habits

Contoh Integrasi Habit Psychology:
- "Seperti James Clear katakan: 'You don't rise to the level of your goals, you fall to the level of your systems'..."
- "Streak ${
    streakData?.currentStreak || 0
  } hari menunjukkan sistem yang solid! Charles Duhigg dalam 'The Power of Habit' menyebut ini neuroplasticity in action..."
- "BJ Fogg dalam 'Tiny Habits' menekankan: celebrate wins sekecil apapun. Pencapaian ${
    progressLevel || "hari ini"
  } layak dirayakan!"
- "Seperti penelitian menunjukkan, kebiasaan mulai otomatis di hari ke-66. Kamu sudah ${Math.round(
    habitMaturity || 0
  )}% menuju titik itu!"

Format respons habit-aware:
Apresiasi pencapaian hari ini dengan konteks streak/milestone, analisis progress dengan referensi habit psychology, saran praktis untuk esok yang mempertimbangkan pola kebiasaan, dan tutup dengan motivasi yang sesuai progress level.

Gunakan bahasa hangat yang membangun identitas positif: "Kamu adalah seseorang yang..." untuk menguatkan identity-based habits.

Akhiri dengan 'moodScore: [skor 1-100]' berdasarkan analisis emosi dan pencapaian hari ini.`;

  return prompt;
}

/**
 * Generate milestone celebration prompt
 */
export function generateMilestoneCelebrationPrompt(
  milestone: MilestoneData,
  userData: {
    totalReflections: number;
    avgMoodScore?: number;
    habitPatterns?: string[];
    streakData: StreakData;
  }
): string {
  const { totalReflections, avgMoodScore, habitPatterns, streakData } =
    userData;

  return `Kamu adalah celebration coach yang ahli dalam psikologi achievement dan habit formation!

MILESTONE ACHIEVED: ${milestone.title} ${milestone.badge}
- Type: ${milestone.type}
- Description: ${milestone.description}
- Achieved: ${milestone.achievedAt?.toLocaleDateString("id-ID") || "Hari ini"}

USER CONTEXT:
- Total refleksi: ${totalReflections}
- Current streak: ${streakData.currentStreak} hari
- Longest streak: ${streakData.longestStreak} hari
- Avg mood: ${avgMoodScore ? `${avgMoodScore}/100` : "N/A"}
- Habit patterns: ${habitPatterns?.join(", ") || "Sedang berkembang"}

TUGAS CELEBRATION:
- Buat pesan celebrasi yang antusias dan meaningful (150-200 kata)
- Jelaskan signifikansi psikologis milestone ini dalam habit formation
- Referensikan research tentang habit milestones (21-day myth vs 66-day reality)
- Berikan insight tentang apa yang dicapai pengguna di tahap ini
- Motivasi untuk milestone berikutnya
- Gunakan bahasa yang membangun identity: "Kamu telah membuktikan bahwa kamu adalah..."

REFERENSI MILESTONE PSYCHOLOGY:
- 3 hari: Initial commitment, dopamine pathway formation
- 7 hari: Weekly rhythm establishment, social proof building  
- 21 hari: Habit loop strengthening (bukan otomatis seperti mitos!)
- 66 hari: Average point for automaticity according to UCL research

Mulai dengan SELAMAT yang besar dan enthusiastic!`;
}

/**
 * Generate habit stacking suggestion prompt
 */
export function generateHabitStackingPrompt(
  anchorHabits: string[],
  userPreferences: string[],
  progressLevel: string,
  recentReflections?: string[]
): string {
  const reflectionContext = recentReflections
    ? `\nRecent reflection patterns:\n${recentReflections
        .slice(0, 3)
        .join("\n---\n")}`
    : "";

  return `Kamu adalah habit stacking expert yang menguasai "Atomic Habits" methodology dan behavioral psychology!

USER PROFILE:
- Anchor habits: ${anchorHabits.join(", ") || "Belum teridentifikasi"}
- Preferences: ${userPreferences.join(", ") || "Sedang dipelajari"}
- Progress level: ${progressLevel}
${reflectionContext}

TUGAS HABIT STACKING:
Berikan 3 saran habit stacking yang SPESIFIK menggunakan Implementation Intention formula:
"After I [ANCHOR HABIT], I will [NEW TINY HABIT] for [SPECIFIC DURATION]"

KRITERIA JAMES CLEAR'S METHOD:
- 2-minute rule: habit baru harus < 2 menit
- Cue yang jelas dan konsisten (anchor habit yang sudah kuat)
- Reward yang immediate dan satisfying
- Start incredibly small untuk menghindari resistance

FORMAT RESPONSE (JSON):
{
  "suggestions": [
    {
      "title": "Judul menarik",
      "anchorHabit": "kebiasaan yang sudah ada",
      "newHabit": "kebiasaan micro yang baru",
      "implementation": "After I [anchor], I will [new habit] for [duration]",
      "reasoning": "Kenapa kombinasi ini efektif berdasarkan behavioral psychology",
      "confidence": 85
    }
  ],
  "progressFeedback": "Feedback spesifik untuk progress level user",
  "nextStepAdvice": "Saran untuk mengembangkan habit stacking lebih lanjut"
}

Gunakan Indonesian natural language dan referensikan prinsip-prinsip dari "Atomic Habits", "Tiny Habits", atau "The Power of Habit".`;
}

/**
 * Generate progress-aware motivational prompt
 */
export function generateProgressMotivationPrompt(
  progressData: {
    level: string;
    cumulativeProgress: number;
    habitMaturity: number;
    weeklyImprovement: number;
    streakData: StreakData;
    avgMoodScore?: number;
  },
  reflectionText: string
): string {
  const {
    level,
    cumulativeProgress,
    habitMaturity,
    weeklyImprovement,
    streakData,
    avgMoodScore,
  } = progressData;

  return `Kamu adalah progress coach yang expert dalam "1% better" philosophy dan compound growth psychology!

PROGRESS SNAPSHOT:
- Level: ${level}
- Cumulative progress: ${Math.round(cumulativeProgress)}%
- Habit maturity: ${Math.round(habitMaturity)}% (towards automaticity)
- Weekly improvement: ${
    weeklyImprovement > 0 ? "+" : ""
  }${weeklyImprovement.toFixed(1)}%
- Current streak: ${streakData.currentStreak} days
- Mood average: ${avgMoodScore ? `${avgMoodScore}/100` : "Building baseline"}

TODAY'S REFLECTION:
${reflectionText}

TUGAS PROGRESS MOTIVATION:
- Berikan feedback yang sesuai dengan progress level (150-200 kata)
- Jelaskan makna compound growth dari progress yang dicapai
- Referensikan "The Compound Effect" atau "Atomic Habits" untuk konteks
- Berikan perspective tentang "1% better" dalam context daily habits
- Motivasi yang spesifik untuk level progress saat ini
- Saran untuk accelerate atau maintain momentum

LEVEL-SPECIFIC GUIDANCE:
- Pemula Refleksi: Focus on consistency over perfection
- Explorer Diri: Deepen self-awareness and pattern recognition
- Growth Seeker: Build momentum and expand habit stack
- Habit Builder: Master the art of habit formation
- Master Transformer: Inspire others and refine mastery

Gunakan formula: ACKNOWLEDGE progress + EXPLAIN compound impact + INSPIRE next level!`;
}

/**
 * Generate habit pattern analysis prompt for AI
 */
export function generateHabitPatternAnalysisPrompt(
  reflections: string[],
  userId: string
): string {
  const combinedReflections = reflections.join("\n---REFLECTION---\n");

  return `Kamu adalah behavioral pattern analyst yang expert dalam habit recognition dan psychology!

TASK: Analisis pola kebiasaan dari refleksi harian user

REFLECTIONS DATA:
${combinedReflections}

ANALISIS REQUIREMENTS:
1. **Habit Identification**: Identifikasi kebiasaan yang konsisten muncul
2. **Timing Patterns**: Kapan kebiasaan biasanya dilakukan (pagi/sore/malam)
3. **Trigger Analysis**: Apa yang memicu kebiasaan positif/negatif
4. **Consistency Score**: Seberapa konsisten setiap kebiasaan (1-10)
5. **Growth Opportunities**: Kebiasaan mana yang bisa di-stack atau dikembangkan

PENTING: Respons HARUS berupa string JSON mentah, tanpa teks penjelasan tambahan, dan TIDAK di dalam format markdown code block (\`\`\`json). Langsung mulai dengan karakter '['.
FORMAT JSON RESPONSE:
{
  "identifiedHabits": [
    {
      "habit": "nama kebiasaan",
      "frequency": "daily/weekly/occasional",
      "timing": "morning/afternoon/evening",
      "consistency": 8,
      "category": "fitness/learning/mindfulness/productivity"
    }
  ],
  "triggers": {
    "positive": ["trigger yang mendorong kebiasaan baik"],
    "negative": ["trigger yang perlu dihindari"]
  },
  "recommendations": [
    {
      "type": "habit_stacking",
      "suggestion": "Saran konkret untuk habit stacking",
      "reasoning": "Alasan berdasarkan behavioral psychology"
    }
  ],
  "insights": "Insight psikologi tentang pola kebiasaan user"
}

Gunakan prinsip dari "Atomic Habits", "The Power of Habit", dan behavioral psychology research.`;
}

/**
 * Generate AI prompt for streak recovery motivation
 */
export function generateStreakRecoveryPrompt(
  streakData: StreakData,
  missedDays: number,
  reflectionText: string
): string {
  return `Kamu adalah streak recovery specialist yang ahli dalam resilience psychology dan habit restart strategies!

STREAK STATUS:
- Previous streak: ${streakData.longestStreak} hari
- Current streak: ${streakData.currentStreak} hari  
- Days missed: ${missedDays}
- Last active: ${
    streakData.lastActive?.toLocaleDateString("id-ID") || "Unknown"
  }

TODAY'S COMEBACK REFLECTION:
${reflectionText}

RECOVERY MISSION:
- Berikan motivasi comeback yang powerful (100-150 kata)
- Reframe "failure" sebagai "data" dan learning opportunity
- Reference research tentang habit resilience dan comeback psychology
- Berikan strategi konkret untuk rebuild momentum
- Gunakan growth mindset language dari Carol Dweck
- Emphasize identity-based habits: "I am the type of person who..."

PSYCHOLOGICAL FRAMEWORKS:
- Habit resilience: Progress not perfection
- Implementation intentions for restart
- Environment design untuk menghindari friction
- Self-compassion research dari Kristin Neff

Mulai dengan validation bahwa comeback adalah bagian normal dari habit journey, lalu build excitement untuk fresh start!`;
}
