import type { BotContext } from "../types/bot-context.js";

/**
 * /start command handler
 * Provides welcome message and basic instructions for new users
 */
export async function startCommand(ctx: BotContext): Promise<void> {
  try {
    const userName = ctx.user?.firstName || ctx.user?.username || "Teman";
    const isNewUser =
      ctx.user && new Date(ctx.user.createdAt).getTime() > Date.now() - 60000; // Created within last minute

    let welcomeMessage = "";

    if (isNewUser) {
      welcomeMessage = `🎉 Selamat datang di Satupersen Bot, ${userName}!

🌟 *Apa itu Satupersen?*
Satupersen adalah bot refleksi harian yang membantu Anda berkembang 1% setiap hari melalui refleksi diri yang konsisten.

✨ *Fitur Utama:*
• 📝 Refleksi harian dengan bantuan AI
• 📊 Analisis perkembangan 3 hari terakhir  
• 📈 Statistik dan motivasi mingguan
• 🤖 Saran personal untuk perbaikan

🚀 *Mulai Perjalanan Anda:*
Gunakan /reflect untuk memulai refleksi harian pertama Anda!`;
    } else {
      welcomeMessage = `👋 Selamat datang kembali, ${userName}!

🌟 Siap untuk melanjutkan perjalanan pengembangan diri Anda?

💡 *Perintah yang tersedia:*
• /reflect - Mulai refleksi harian
• /summary - Lihat ringkasan hari ini  
• /stats - Statistik perkembangan
• /help - Panduan lengkap

Mari lanjutkan perjalanan menuju versi terbaik dari diri Anda! 🚀`;
    }

    await ctx.reply(welcomeMessage, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📝 Mulai Refleksi", callback_data: "start_reflection" },
            { text: "📚 Panduan", callback_data: "show_help" },
          ],
        ],
      },
    });

    // Log the start command usage
    console.log(
      `🎯 /start command used by ${userName} (${ctx.user?.telegramId})`
    );
  } catch (error) {
    console.error("Error in start command:", error);
    await ctx.reply(
      "❌ Maaf, terjadi kesalahan saat memuat halaman utama. Silakan coba lagi atau hubungi support."
    );
  }
}

/**
 * Handle inline keyboard callbacks for start command
 */
export async function handleStartCallbacks(ctx: BotContext): Promise<void> {
  if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) {
    return;
  }

  const callbackData = ctx.callbackQuery.data;

  try {
    switch (callbackData) {
      case "start_reflection":
        await ctx.answerCbQuery("Memulai refleksi...");
        await ctx.reply(
          "📝 *Refleksi Harian*\n\n" +
            "Ceritakan aktivitas Anda hari ini. Apa yang sudah Anda lakukan? Apa yang dipelajari? Tantangan apa yang dihadapi?\n\n" +
            "Tuliskan dalam pesan berikutnya:",
          { parse_mode: "Markdown" }
        );
        break;

      case "show_help":
        await ctx.answerCbQuery("Menampilkan panduan...");
        // Call help command directly
        const { helpCommand } = await import("./help-command.js");
        await helpCommand(ctx);
        break;

      default:
        await ctx.answerCbQuery("Perintah tidak dikenali");
    }
  } catch (error) {
    console.error("Error handling start callback:", error);
    await ctx.answerCbQuery("Terjadi kesalahan, silakan coba lagi");
  }
}
