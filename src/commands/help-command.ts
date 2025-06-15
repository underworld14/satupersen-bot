import type { BotContext } from "../types/bot-context.js";

/**
 * /help command handler
 * Provides comprehensive usage guide and command descriptions
 */
export async function helpCommand(ctx: BotContext): Promise<void> {
  try {
    const helpMessage = `📚 *Panduan Satupersen Bot*

🎯 *Tujuan*
Membantu Anda berkembang 1% setiap hari melalui refleksi diri yang konsisten dan terarah\\.

🤖 *Perintah Utama:*

📝 /reflect \\- Mulai refleksi harian
   Ceritakan aktivitas harian Anda, dan bot akan memberikan analisis dengan bantuan AI berdasarkan perkembangan 3 hari terakhir\\.

📊 /summary \\- Ringkasan hari ini
   Lihat ringkasan refleksi yang sudah Anda buat hari ini\\.

📈 /stats \\- Statistik perkembangan
   Melihat statistik refleksi mingguan/bulanan dan motivasi untuk terus berkembang\\.

🔥 /streak \\- Status streak refleksi
   Lihat streak harian, kalender visual, dan motivasi untuk konsistensi\\.

🎯 /habits \\- Analisis kebiasaan \\& saran
   Dapatkan saran habit stacking dan analisis pola kebiasaan personal\\.

📊 /progress \\- Progress "1% Better"
   Lihat kemajuan kumulatif, habit maturity meter, dan timeline perkembangan\\.

🏠 /start \\- Kembali ke menu utama
   Menampilkan halaman utama dengan tombol navigasi\\.

❓ /help \\- Panduan ini
   Menampilkan panduan lengkap penggunaan bot\\.

💡 *Tips Refleksi Efektif:*
• Jadilah jujur tentang pencapaian dan kegagalan
• Fokus pada pembelajaran, bukan hanya hasil
• Tulis minimal 2\\-3 kalimat untuk analisis yang baik
• Refleksikan secara konsisten setiap hari

🔄 *Cara Kerja Analisis AI:*
Bot akan membandingkan refleksi Anda dengan 2 hari sebelumnya untuk:
• Mengidentifikasi pola perkembangan
• Memberikan saran konstruktif
• Memotivasi pencapaian berkelanjutan
• Menyoroti area yang perlu ditingkatkan

🚀 *Mulai Sekarang:*
Ketik /reflect untuk memulai refleksi harian Anda\\!`;

    // Try with Markdown first
    try {
      await ctx.reply(helpMessage, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📝 Mulai Refleksi", callback_data: "start_reflection" },
              { text: "📊 Lihat Statistik", callback_data: "show_stats" },
            ],
            [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
          ],
        },
      });
    } catch (markdownError) {
      console.warn(
        "MarkdownV2 failed, trying regular Markdown:",
        markdownError
      );

      // Fallback to simpler Markdown
      const simpleMessage = `📚 *Panduan Satupersen Bot*

🎯 *Tujuan*
Membantu Anda berkembang 1% setiap hari melalui refleksi diri yang konsisten.

🤖 *Perintah Utama:*

📝 /reflect - Mulai refleksi harian
📊 /summary - Ringkasan hari ini  
📈 /stats - Statistik perkembangan
🔥 /streak - Status streak refleksi
🎯 /habits - Analisis kebiasaan & saran
📊 /progress - Progress "1% Better"
🏠 /start - Menu utama
❓ /help - Panduan ini

💡 *Tips Refleksi Efektif:*
• Jadilah jujur tentang pencapaian dan kegagalan
• Fokus pada pembelajaran, bukan hanya hasil
• Tulis minimal 2-3 kalimat untuk analisis yang baik
• Refleksikan secara konsisten setiap hari

🚀 *Mulai Sekarang:*
Ketik /reflect untuk memulai refleksi harian Anda!`;

      await ctx.reply(simpleMessage, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📝 Mulai Refleksi", callback_data: "start_reflection" },
              { text: "📊 Lihat Statistik", callback_data: "show_stats" },
            ],
            [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
          ],
        },
      });
    }

    console.log(
      `📚 /help command used by ${ctx.user?.firstName || ctx.user?.username} (${
        ctx.user?.telegramId
      })`
    );
  } catch (error) {
    console.error("Error in help command:", error);

    // Final fallback - plain text
    try {
      await ctx.reply(
        "📚 Panduan Satupersen Bot\n\n" +
          "🎯 Tujuan: Membantu Anda berkembang 1% setiap hari\n\n" +
          "Perintah utama:\n" +
          "• /reflect - Mulai refleksi harian\n" +
          "• /summary - Ringkasan hari ini\n" +
          "• /stats - Statistik perkembangan\n" +
          "• /streak - Status streak refleksi\n" +
          "• /habits - Analisis kebiasaan & saran\n" +
          "• /progress - Progress '1% Better'\n" +
          "• /start - Menu utama\n" +
          "• /help - Panduan ini\n\n" +
          "Tips: Jadilah jujur dalam refleksi dan fokus pada pembelajaran!\n\n" +
          "Ketik /reflect untuk memulai!",
        {
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
    } catch (fallbackError) {
      console.error("All fallbacks failed:", fallbackError);
      await ctx.reply(
        "Panduan bot: /start /help /reflect /summary /stats /streak /habits /progress"
      );
    }
  }
}
