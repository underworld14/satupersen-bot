import type { BotContext } from "../types/bot-context";

export async function streakCommand(ctx: BotContext): Promise<void> {
  try {
    const userId = ctx.user?.id;
    if (!userId) {
      await ctx.reply(
        "❌ Pengguna tidak ditemukan. Silakan gunakan /start terlebih dahulu."
      );
      return;
    }

    const streakData = await ctx.streakService.getStreakData(userId);

    if (!streakData) {
      await ctx.reply(
        "❌ Data streak tidak ditemukan. Mulai refleksi harian dengan /reflect!"
      );
      return;
    }

    // Generate streak calendar
    const calendarData = await ctx.streakService.getStreakCalendar(userId);
    const stats = await ctx.streakService.getStreakStats(userId);

    // Build streak message
    let message = `🔥 **Status Streak Refleksi**\n\n`;

    // Current streak info
    message += `📊 **Statistik Streak:**\n`;
    message += `• Streak saat ini: **${streakData.currentStreak} hari** 🎯\n`;
    message += `• Streak terpanjang: **${streakData.longestStreak} hari** 🏆\n`;
    message += `• Terakhir aktif: ${
      streakData.lastActive
        ? new Date(streakData.lastActive).toLocaleDateString("id-ID")
        : "Belum pernah"
    }\n\n`;

    // Streak stats
    if (stats) {
      message += `📈 **Analisis Streak:**\n`;
      message += `• Total hari aktif: ${stats.totalDaysActive} hari\n`;
      message += `• Konsistensi: ${stats.streakConsistencyRate}%\n`;
      message += `• Rata-rata panjang streak: ${stats.averageStreakLength} hari\n`;
      message += `• Streak terpanjang bulan ini: ${stats.longestStreakThisMonth} hari\n\n`;
    }

    // Calendar visualization
    message += `📅 **Kalender Streak (30 hari terakhir):**\n`;

    // Format calendar as emoji visualization
    let calendarDisplay = "";
    const daysPerRow = 7;
    for (let i = 0; i < calendarData.length; i += daysPerRow) {
      const week = calendarData.slice(i, i + daysPerRow);
      const weekEmojis = week
        .map((day) => {
          if (day.hasReflection) {
            // Use different emojis based on mood score
            if (day.moodScore && day.moodScore >= 80) return "🔥";
            if (day.moodScore && day.moodScore >= 60) return "✅";
            return "💚";
          }
          return "⚪";
        })
        .join(" ");
      calendarDisplay += weekEmojis + "\n";
    }

    message += calendarDisplay;
    message += `\n🔥 = Mood Tinggi (80+)  ✅ = Mood Baik (60+)  💚 = Refleksi  ⚪ = Tidak ada\n\n`;

    // Motivation message based on streak
    if (streakData.currentStreak === 0) {
      message += `💪 **Mulai Sekarang!**\n`;
      message += `Setiap perjalanan dimulai dengan langkah pertama. Gunakan /reflect untuk memulai streak baru!`;
    } else if (streakData.currentStreak < 3) {
      message += `🌱 **Awal yang Bagus!**\n`;
      message += `Kamu sudah memulai! Konsistensi kecil akan membangun kebiasaan besar. Tetap semangat!`;
    } else if (streakData.currentStreak < 7) {
      message += `🚀 **Momentum Terbentuk!**\n`;
      message += `Wow! Kamu sudah membangun momentum yang solid. Jangan berhenti sekarang!`;
    } else if (streakData.currentStreak < 21) {
      message += `⭐ **Luar Biasa!**\n`;
      message += `Streak yang menakjubkan! Kamu sudah membuktikan komitmen terhadap pertumbuhan diri.`;
    } else {
      message += `👑 **Master Refleksi!**\n`;
      message += `Incredible! Kamu sudah menjadi contoh konsistensi. Terus inspirasi orang lain!`;
    }

    // Add streak recovery info if needed
    if (streakData.currentStreak > 0) {
      const recoveryInfo = await ctx.streakService.getStreakRecoveryInfo(
        userId
      );
      if (recoveryInfo.daysMissed > 0) {
        message += `\n\n⚡ **Info Streak:**\n`;
        message += `${recoveryInfo.recoveryMessage}`;
      }
    }

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in streak command:", error);
    await ctx.reply(
      "❌ Terjadi kesalahan saat mengambil data streak. Silakan coba lagi nanti."
    );
  }
}
