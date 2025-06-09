import type { BotContext } from "../types/bot-context.js";

/**
 * /summary command handler
 * Shows today's reflection summary
 */
export async function summaryCommand(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.user) {
      await ctx.reply("❌ User tidak ditemukan. Silakan mulai dengan /start");
      return;
    }

    // Get today's reflection
    const todayReflection = await ctx.reflectionService.getTodayReflection(
      ctx.user.id
    );

    if (!todayReflection) {
      await ctx.reply(
        "📅 *Belum ada refleksi hari ini*\n\n" +
          "Kamu belum melakukan refleksi hari ini. Yuk mulai sekarang!\n\n" +
          "💡 *Kenapa refleksi penting?*\n" +
          "• Membantu mengidentifikasi perkembangan harian\n" +
          "• Meningkatkan kesadaran diri\n" +
          "• Mencatat pembelajaran dan pencapaian\n" +
          "• Membangun kebiasaan refleksi yang baik",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📝 Mulai Refleksi",
                  callback_data: "start_reflection",
                },
              ],
              [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
            ],
          },
        }
      );
      return;
    }

    // Format reflection date
    const reflectionDate = todayReflection.date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Format the summary message
    const summaryMessage =
      `📊 *Ringkasan Refleksi Hari Ini*\n\n` +
      `📅 *Tanggal:* ${reflectionDate}\n` +
      `📝 *Jumlah kata:* ${todayReflection.wordCount} kata\n` +
      `😊 *Skor Mood Hari Ini:* ${
        todayReflection.moodScore !== null
          ? `${todayReflection.moodScore}/100`
          : "N/A"
      }\n` +
      `⏰ *Waktu refleksi:* ${todayReflection.createdAt.toLocaleTimeString(
        "id-ID",
        { hour: "2-digit", minute: "2-digit" }
      )}\n\n` +
      `💭 *Refleksi Anda:*\n"${todayReflection.input}"\n\n`;

    // Add AI summary if available
    let fullMessage = summaryMessage;
    if (todayReflection.aiSummary) {
      fullMessage += `🤖 *Analisis AI:*\n${todayReflection.aiSummary}`;
    }

    await ctx.reply(fullMessage, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📈 Lihat Statistik", callback_data: "show_stats" },
            { text: "📝 Refleksi Baru", callback_data: "start_reflection" },
          ],
          [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
        ],
      },
    });

    console.log(
      `📊 /summary command used by ${
        ctx.user.firstName || ctx.user.username
      } (${ctx.user.telegramId})`
    );
  } catch (error) {
    console.error("Error in summary command:", error);
    await ctx.reply(
      "❌ Maaf, terjadi kesalahan saat mengambil ringkasan. Silakan coba lagi."
    );
  }
}

/**
 * Handle summary-related callbacks
 */
export async function handleSummaryCallbacks(ctx: BotContext): Promise<void> {
  if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) {
    return;
  }

  const callbackData = ctx.callbackQuery.data;

  try {
    switch (callbackData) {
      case "show_summary":
        await ctx.answerCbQuery("Menampilkan ringkasan...");
        await summaryCommand(ctx);
        break;
    }
  } catch (error) {
    console.error("Error handling summary callback:", error);
    await ctx.answerCbQuery("Terjadi kesalahan, silakan coba lagi");
  }
}
