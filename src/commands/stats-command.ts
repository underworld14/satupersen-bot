import type { BotContext } from "../types/bot-context.js";

/**
 * /stats command handler
 * Shows weekly reflection statistics
 */
export async function statsCommand(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.user) {
      await ctx.reply("❌ User tidak ditemukan. Silakan mulai dengan /start");
      return;
    }

    // Show loading message
    const loadingMsg = await ctx.reply(
      "📊 Sedang menghitung statistik...\n\n⏳ Mohon tunggu sebentar..."
    );

    // Get weekly statistics
    const weeklyStats = await ctx.reflectionService.getWeeklyStats(ctx.user.id);

    // Delete loading message
    try {
      await ctx.deleteMessage(loadingMsg.message_id);
    } catch {
      // Ignore if deletion fails
    }

    // Calculate completion percentage
    const completionPercentage = Math.round(
      (weeklyStats.reflectionCount / weeklyStats.totalDays) * 100
    );

    // Create motivational message based on stats
    let motivationMessage = "";
    if (completionPercentage >= 80) {
      motivationMessage = "🔥 Luar biasa! Kamu sangat konsisten!";
    } else if (completionPercentage >= 60) {
      motivationMessage = "👍 Bagus! Terus pertahankan konsistensi!";
    } else if (completionPercentage >= 40) {
      motivationMessage = "💪 Mulai baik! Coba tingkatkan lagi ya!";
    } else {
      motivationMessage =
        "🌱 Yuk mulai lebih konsisten! Setiap langkah kecil berarti.";
    }

    // Format the stats message
    const statsMessage =
      `📊 *Statistik Refleksi Mingguan*\n\n` +
      `🗓 *Periode:* 7 hari terakhir\n` +
      `📝 *Jumlah refleksi:* ${weeklyStats.reflectionCount} dari ${weeklyStats.totalDays} hari\n` +
      `📈 *Tingkat konsistensi:* ${completionPercentage}%\n` +
      `📏 *Rata-rata kata per hari:* ${weeklyStats.averageWordsPerDay} kata\n` +
      `⭐ *Hari paling aktif:* ${weeklyStats.mostActiveDay}\n\n` +
      `🎯 *Motivasi:* ${motivationMessage}\n\n` +
      `💡 *Tips:* Konsistensi adalah kunci! Coba refleksi setiap hari meski hanya beberapa kalimat.`;

    await ctx.reply(statsMessage, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📝 Refleksi Sekarang", callback_data: "start_reflection" },
            { text: "📊 Lihat Ringkasan", callback_data: "show_summary" },
          ],
          [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
        ],
      },
    });

    console.log(
      `📈 /stats command used by ${ctx.user.firstName || ctx.user.username} (${
        ctx.user.telegramId
      })`
    );
  } catch (error) {
    console.error("Error in stats command:", error);
    await ctx.reply(
      "❌ Maaf, terjadi kesalahan saat mengambil statistik. Silakan coba lagi."
    );
  }
}

/**
 * Handle stats-related callbacks
 */
export async function handleStatsCallbacks(ctx: BotContext): Promise<void> {
  if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) {
    return;
  }

  const callbackData = ctx.callbackQuery.data;

  try {
    switch (callbackData) {
      case "show_stats":
        await ctx.answerCbQuery("Menampilkan statistik...");
        await statsCommand(ctx);
        break;
    }
  } catch (error) {
    console.error("Error handling stats callback:", error);
    await ctx.answerCbQuery("Terjadi kesalahan, silakan coba lagi");
  }
}
