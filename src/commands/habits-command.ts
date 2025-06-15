import type { BotContext } from "../types/bot-context";
import { Markup } from "telegraf";

export async function habitsCommand(ctx: BotContext): Promise<void> {
  try {
    const userId = ctx.user?.id;
    if (!userId) {
      await ctx.reply(
        "❌ Pengguna tidak ditemukan. Silakan gunakan /start terlebih dahulu."
      );
      return;
    }

    // Get user's habit preferences and recent analysis
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: {
        habitPrefs: true,
        reflections: {
          where: {
            date: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          orderBy: { date: "desc" },
          take: 5,
        },
      },
    });

    if (!user) {
      await ctx.reply("❌ Data pengguna tidak ditemukan.");
      return;
    }

    // Build habits message
    let message = `🎯 **Analisis Kebiasaan & Saran**\n\n`;

    // Show current habit preferences
    if (user.habitPrefs && user.habitPrefs.length > 0) {
      message += `📌 **Preferensi Kebiasaan Kamu:**\n`;
      user.habitPrefs.forEach((pref, index) => {
        message += `${index + 1}. ${pref}\n`;
      });
      message += `\n`;
    } else {
      message += `📌 **Preferensi Kebiasaan:** Belum ada data\n`;
      message += `_Lakukan lebih banyak refleksi untuk mendapatkan analisis yang lebih personal_\n\n`;
    }

    // Get habit suggestions based on recent reflections
    if (user.reflections && user.reflections.length > 0) {
      message += `💡 **Saran Habit Stacking:**\n\n`;

      // Get habit stacking suggestions from latest reflection
      const latestReflection = user.reflections[0];

      if (latestReflection && latestReflection.habitStackingSuggestion) {
        try {
          const suggestion = JSON.parse(
            latestReflection.habitStackingSuggestion
          );
          message += `🔗 **${suggestion.title || "Saran Kebiasaan Baru"}**\n`;
          message += `📍 Kebiasaan dasar: _${suggestion.anchorHabit}_\n`;
          message += `➕ Kebiasaan baru: _${suggestion.newHabit}_\n`;
          message += `💭 ${suggestion.suggestion}\n`;
          message += `🎯 Kategori: ${suggestion.category}\n`;
          message += `⭐ Confidence: ${suggestion.confidence}/10\n\n`;
        } catch (error) {
          console.error("Error parsing habit suggestion:", error);
          message += `_Sedang menganalisis pola kebiasaan kamu..._\n\n`;
        }
      } else {
        message += `_Saran habit stacking akan muncul setelah beberapa refleksi lagi_\n\n`;
      }

      // Show habit patterns analysis
      message += `📊 **Analisis Pola Kebiasaan (7 hari terakhir):**\n`;

      // Count habit-related keywords from recent reflections
      const habitKeywords = [
        "olahraga",
        "belajar",
        "membaca",
        "menulis",
        "meditasi",
        "tidur",
        "makan",
        "kerja",
        "bangun",
        "sarapan",
        "jalan",
        "yoga",
        "coding",
      ];

      const habitCounts: { [key: string]: number } = {};
      user.reflections.forEach((reflection) => {
        const input = reflection.input.toLowerCase();
        habitKeywords.forEach((keyword) => {
          if (input.includes(keyword)) {
            habitCounts[keyword] = (habitCounts[keyword] || 0) + 1;
          }
        });
      });

      const topHabits = Object.entries(habitCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      if (topHabits.length > 0) {
        topHabits.forEach(([habit, count], index) => {
          const percentage = Math.round(
            (count / user.reflections.length) * 100
          );
          const emoji = getHabitEmoji(habit);
          message += `${
            index + 1
          }. ${emoji} ${habit}: ${count}x (${percentage}%)\n`;
        });
      } else {
        message += `_Belum terdeteksi pola kebiasaan yang konsisten_\n`;
      }

      message += `\n`;
    } else {
      message += `📝 **Mulai Refleksi Untuk Analisis Kebiasaan**\n`;
      message += `Lakukan refleksi harian dengan /reflect untuk mendapatkan:\n`;
      message += `• Saran habit stacking personal\n`;
      message += `• Analisis pola kebiasaan\n`;
      message += `• Tips peningkatan konsistensi\n\n`;
    }

    // Add motivational tip
    message += `💪 **Tips Habit Stacking:**\n`;
    message += `1. Mulai dengan kebiasaan yang sudah kuat\n`;
    message += `2. Tambahkan kebiasaan kecil (2 menit rule)\n`;
    message += `3. Lakukan secara bersamaan selama 21-66 hari\n`;
    message += `4. Rayakan keberhasilan kecil!\n\n`;

    message += `🎯 _"We are what we repeatedly do. Excellence, then, is not an act, but a habit." - Aristotle_`;

    // Create inline keyboard for habit feedback and actions
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("👍 Saran Berguna", "habit_feedback_good"),
        Markup.button.callback("👎 Kurang Sesuai", "habit_feedback_bad"),
      ],
      [
        Markup.button.callback("🔄 Analisis Ulang", "habit_reanalyze"),
        Markup.button.callback("📊 Lihat Progress", "habit_progress"),
      ],
    ]);

    await ctx.reply(message, {
      parse_mode: "Markdown",
      ...keyboard,
    });
  } catch (error) {
    console.error("Error in habits command:", error);
    await ctx.reply(
      "❌ Terjadi kesalahan saat menganalisis kebiasaan. Silakan coba lagi nanti."
    );
  }
}

/**
 * Get appropriate emoji for habit keywords
 */
function getHabitEmoji(habit: string): string {
  const emojiMap: { [key: string]: string } = {
    olahraga: "🏃‍♂️",
    belajar: "📚",
    membaca: "📖",
    menulis: "✍️",
    meditasi: "🧘‍♂️",
    tidur: "😴",
    makan: "🍽️",
    kerja: "💼",
    bangun: "⏰",
    sarapan: "🥐",
    jalan: "🚶‍♂️",
    yoga: "🧘‍♀️",
    coding: "💻",
  };

  return emojiMap[habit] || "📌";
}

/**
 * Handle habit feedback callbacks
 */
export async function handleHabitFeedback(ctx: any): Promise<void> {
  try {
    const action = ctx.match[0];
    const userId = ctx.user?.id;

    if (!userId) {
      await ctx.answerCbQuery("❌ Pengguna tidak ditemukan");
      return;
    }

    switch (action) {
      case "habit_feedback_good":
        await ctx.answerCbQuery(
          "👍 Terima kasih! Feedback membantu AI belajar preferensi kamu"
        );
        // TODO: Store positive feedback in database
        break;

      case "habit_feedback_bad":
        await ctx.answerCbQuery(
          "👎 Terima kasih! AI akan menyesuaikan saran untuk kamu"
        );
        // TODO: Store negative feedback in database
        break;

      case "habit_reanalyze":
        await ctx.answerCbQuery("🔄 Menganalisis ulang...");
        // TODO: Re-run habit analysis
        await ctx.reply(
          "🔄 Analisis kebiasaan sedang diperbarui. Gunakan /habits lagi dalam beberapa menit."
        );
        break;

      case "habit_progress":
        await ctx.answerCbQuery("📊 Menampilkan progress...");
        await ctx.reply(
          "📊 Gunakan /progress untuk melihat detail kemajuan kebiasaan kamu!"
        );
        break;

      default:
        await ctx.answerCbQuery("❓ Aksi tidak dikenali");
    }
  } catch (error) {
    console.error("Error handling habit feedback:", error);
    await ctx.answerCbQuery("❌ Terjadi kesalahan");
  }
}
