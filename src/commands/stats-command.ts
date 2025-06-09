import type { BotContext, StatsPeriod } from "../types/bot-context.js";
import {
  generateContent,
  generateThemeAnalysisPrompt,
  generateMotivationalSummaryPrompt, // Added import
} from "../utils/ai-client.js";

/**
 * /stats command handler
 * Asks user to choose between weekly and monthly statistics
 */
export async function statsCommand(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.user) {
      await ctx.reply("❌ User tidak ditemukan. Silakan mulai dengan /start");
      return;
    }

    await ctx.reply("📊 Pilih periode statistik yang ingin Anda lihat:", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📅 Mingguan (7 hari)",
              callback_data: "show_weekly_stats",
            },
            {
              text: "🗓 Bulanan (30 hari)",
              callback_data: "show_monthly_stats",
            },
          ],
          [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
        ],
      },
    });

    console.log(
      `📈 /stats command used by ${ctx.user.firstName || ctx.user.username} (${
        ctx.user.telegramId
      }), showing period selection.`
    );
  } catch (error) {
    console.error("Error in stats command (period selection):", error);
    await ctx.reply(
      "❌ Maaf, terjadi kesalahan. Silakan coba lagi."
    );
  }
}

/**
 * Sends the statistics view (weekly or monthly)
 */
async function sendStatsView(ctx: BotContext, period: StatsPeriod): Promise<void> {
  try {
    if (!ctx.user) {
      // This should ideally not happen if called from a callback after /stats
      await ctx.reply("❌ User tidak ditemukan. Silakan mulai dengan /start");
      return;
    }

    // Show loading message
    // Show loading message
    // Edit: Enhanced loading message
    const loadingMsg = await ctx.reply(
      `📊 Sedang menghitung statistik ${
        period === "weekly" ? "mingguan" : "bulanan"
      } dan menganalisis tema...\n\n⏳ Mohon tunggu sebentar...`
    );

    let themesString = "Tidak ada tema yang dapat diidentifikasi secara jelas.";
    let commonThemesText = ""; // This will be part of the final message

    try {
      // Fetch data from services
      const [kpiData, reflectionsText, trend, insights] = await Promise.all([
        ctx.analyticsService.calculateReflectionKPIs(ctx.user.id, period),
        ctx.reflectionService.getReflectionsTextForPeriod(ctx.user.id, period),
        ctx.analyticsService.getReflectionFrequencyTrend(ctx.user.id, period),
        ctx.analyticsService.generatePersonalizedInsights(ctx.user.id, period),
      ]);

      // Use kpiData for stats.
      // kpiData includes: totalDays, reflectionCount, consistencyPercentage, averageWordsPerDay, mostActiveDay, status

      if (
        reflectionsText &&
        reflectionsText.trim().length > 50 && // Ensure there's some text
        kpiData.reflectionCount > 1 // Min 2 reflections for meaningful themes
      ) {
        console.log(
          `📝 Reflections text for theme analysis (${period}, user ${ctx.user.id}): ${reflectionsText.substring(0,100)}...`
        );
        const themePrompt = generateThemeAnalysisPrompt(reflectionsText);
        if (themePrompt) {
          try {
            await ctx.telegram.editMessageText( // Keep updating loading message
              ctx.chat!.id,
              loadingMsg.message_id,
              undefined,
              `📊 Statistik KPI dasar sudah dihitung.\n🧠 Menganalisis tema umum...\n\n⏳ Mohon tunggu sebentar...`
            );
            themesString = await generateContent(themePrompt);
            if (!themesString || themesString.toLowerCase().includes("tidak ada tema")) {
              themesString = "Belum cukup data untuk analisis tema yang mendalam.";
            }
          } catch (aiError) {
            console.error("Error generating themes from AI:", aiError);
            themesString = "Terjadi kesalahan saat menganalisis tema.";
          }
        } else {
          themesString = "Belum cukup data untuk analisis tema.";
        }
      } else if (kpiData.reflectionCount <=1 ) {
        themesString = "Perlu lebih banyak refleksi untuk analisis tema.";
      }

      // Motivational message logic (using kpiData)
      const completionPercentage = kpiData.consistencyPercentage; // Directly from KPIs
      let motivationMessage = "";

      // Default rule-based motivational message
      if (period === "weekly") {
        if (completionPercentage >= 80) {
          motivationMessage = "🔥 Luar biasa! Kamu sangat konsisten minggu ini!";
        } else if (completionPercentage >= 60) {
          motivationMessage = "👍 Bagus! Terus pertahankan konsistensi mingguanmu!";
        } else if (completionPercentage >= 40) {
          motivationMessage = "💪 Mulai baik! Coba tingkatkan lagi minggu ini ya!";
        } else {
          motivationMessage = "🌱 Yuk mulai lebih konsisten minggu ini! Setiap langkah kecil berarti.";
        }
      } else { // Monthly
        if (completionPercentage >= 75) {
          motivationMessage = "🎉 Fantastis! Konsistensi bulananmu sangat baik!";
        } else if (completionPercentage >= 50) {
          motivationMessage = "✨ Keren! Jaga terus momentum refleksi bulananmu!";
        } else if (completionPercentage >= 25) {
          motivationMessage = "🙌 Sudah cukup baik! Teruslah berusaha membangun kebiasaan bulanan.";
        } else {
          motivationMessage = "🧗‍♀️ Refleksi bulanan adalah perjalanan. Jangan menyerah, teruslah mencoba!";
        }
      }
      const defaultMotivationMessage = motivationMessage;

      if (kpiData.reflectionCount > 0) {
        try {
          if (!(kpiData.reflectionCount > 1 && themesString.includes("Terjadi kesalahan"))) {
            await ctx.telegram.editMessageText( // Update loading message
              ctx.chat!.id,
              loadingMsg.message_id,
              undefined,
              `📊 Statistik & tema sudah siap.\n💡 Menyusun motivasi personal untukmu...\n\n⏳ Mohon tunggu sebentar...`
            );
          }
          // Construct a temporary StatsData-like object for the prompt if needed, or adapt prompt
          // For now, kpiData itself might be enough or prompt needs adjustment.
          // Assuming generateMotivationalSummaryPrompt can handle kpiData structure or relevant parts.
          const tempStatsDataForPrompt = { // Adapt kpiData to structure expected by prompt if necessary
              totalReflections: kpiData.reflectionCount,
              daysRecorded: kpiData.reflectionCount, // Or adjust as needed
              totalDays: kpiData.totalDays,
              averageWordCount: kpiData.averageWordsPerDay,
              mostActiveDay: kpiData.mostActiveDay,
              reflectionStreak: kpiData.reflectionStreak || 0, // If available
          };
          const motivationalPrompt = generateMotivationalSummaryPrompt(
            tempStatsDataForPrompt, // Pass the adapted or direct kpiData
            themesString,
            period,
            reflectionsText
          );
          const aiSummary = await generateContent(motivationalPrompt);
          if (aiSummary && aiSummary.length > 20) {
            motivationMessage = aiSummary;
          } else {
            motivationMessage = defaultMotivationMessage;
          }
        } catch (summaryError) {
          console.error("Error generating AI motivational summary:", summaryError);
          motivationMessage = defaultMotivationMessage;
        }
      } else {
         motivationMessage = "Yuk mulai refleksimu untuk mendapatkan motivasi personal! 🌱";
      }

      // Final deletion of loading message
      try {
        await ctx.deleteMessage(loadingMsg.message_id);
      } catch { /* Ignore */ }

      commonThemesText = `🎨 *Tema Umum ${
        period === "weekly" ? "Mingguan" : "Bulanan"
      }:*\n${themesString
        .split(",")
        .map((s) => `  - ${s.trim()}`)
        .join("\n")}\n\n`;

      let frequencyString = "Belum ada refleksi";
      if (kpiData.reflectionCount > 0) {
        const avgDaysPerReflection = kpiData.totalDays / kpiData.reflectionCount;
        if (avgDaysPerReflection <= 1.2) frequencyString = "Hampir setiap hari";
        else if (avgDaysPerReflection <= 2.5) frequencyString = `Rata-rata setiap ${Math.round(avgDaysPerReflection)} hari sekali`;
        else if (avgDaysPerReflection <= 4) frequencyString = `Rata-rata setiap ${Math.round(avgDaysPerReflection)} hari sekali`;
        else if (avgDaysPerReflection <= 7.5 && period === "weekly") frequencyString = "Sekitar seminggu sekali";
        else if (avgDaysPerReflection <= 10 && period === "monthly") frequencyString = "Sekitar seminggu sekali";
        else if (avgDaysPerReflection <= 15 && period === "monthly") frequencyString = "Sekitar 2 minggu sekali";
        else frequencyString = `Rata-rata setiap ${Math.round(avgDaysPerReflection)} hari sekali`;
      }
      if (period === "monthly" && kpiData.reflectionCount === 1 && kpiData.totalDays === 30) {
        frequencyString = "Sebulan sekali";
      } else if (period === "monthly" && kpiData.reflectionCount > 1 && kpiData.reflectionCount < 4) {
        const avgDays = Math.round(kpiData.totalDays / kpiData.reflectionCount);
        frequencyString = `Rata-rata setiap ${avgDays} hari sekali`;
      }

      const insightsText = insights.length > 0 ? `\n🧠 *Insight & Rekomendasi Personal:*\n${insights.map(i => `  - ${i}`).join('\n')}\n` : "";

      const statsMessage =
        `📊 *Statistik Refleksi ${period === "weekly" ? "Mingguan" : "Bulanan"}*\n\n` +
        `🗓 *Periode:* ${kpiData.totalDays} hari terakhir\n` +
        `📝 *Jumlah Refleksi:* ${kpiData.reflectionCount} dari ${kpiData.totalDays} hari\n` +
        `📈 *Tingkat Konsistensi:* ${completionPercentage.toFixed(2)}%\n` +
        `🔄 *Frekuensi Refleksi:* ${frequencyString}\n` +
        `📉 *Tren Frekuensi Refleksi:* ${trend}\n` +
        `😊 *Rata-rata Skor Mood:* ${kpiData.averageMoodScore !== null ? `${kpiData.averageMoodScore}/100` : "N/A"}\n` +
        `🧠 *Tren Skor Mood:* ${kpiData.moodScoreTrend}\n` +
        `📏 *Rata-rata Kata/Refleksi:* ${kpiData.averageWordsPerDay.toFixed(2)} kata\n` +
        `⭐ *Hari Paling Aktif:* ${kpiData.mostActiveDay}\n\n` +
        (kpiData.reflectionCount > 1 ? commonThemesText : "Refleksi minimal 2 untuk melihat tema umum.\n\n") +
        `🎯 *Motivasi Personal:* ${motivationMessage}\n` +
        insightsText + // Added Insights
        `\n💡 *Tips Umum:* ${
          period === "weekly"
            ? "Konsistensi adalah kunci! Coba refleksi setiap hari meski hanya beberapa kalimat."
            : "Lihat gambaran besar progresmu! Refleksi bulanan membantumu melihat tren jangka panjang."
        }\n\n` +
        `🔍 *Status Data KPI:* ${kpiData.status}`;

      await ctx.reply(statsMessage, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📝 Refleksi Sekarang", callback_data: "start_reflection" },
              { text: "📊 Pilih Periode Lain", callback_data: "show_stats_opnieuw" }, // "opnieuw" means again
            ],
            [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
          ],
        },
      });

       console.log(
        `📊 Stats view (${period}) sent to ${ctx.user.firstName || ctx.user.username} (${
          ctx.user.telegramId
        })`
      );

    } catch (error) { // Catch block for the main try-catch in sendStatsView
        console.error(`Error in sendStatsView (${period}):`, error);
        // Ensure loading message is deleted even if an error occurs later
        try {
            await ctx.deleteMessage(loadingMsg.message_id);
        } catch (delError) {
            console.error("Failed to delete loading message on error:", delError);
        }
        await ctx.reply(
            `❌ Maaf, terjadi kesalahan saat mengambil statistik ${
            period === "weekly" ? "mingguan" : "bulanan"
            }. Silakan coba lagi.`
        );
    }
}


/**
    // Calculate reflection frequency
    let frequencyString = "Belum ada refleksi";
    if (statsData.reflectionCount > 0) {
      const avgDaysPerReflection = statsData.totalDays / statsData.reflectionCount;
      if (avgDaysPerReflection <= 1.2) { // Roughly daily
        frequencyString = "Hampir setiap hari";
      } else if (avgDaysPerReflection <= 2.5) { // Every other day
        frequencyString = `Rata-rata setiap ${Math.round(avgDaysPerReflection)} hari sekali`;
      } else if (avgDaysPerReflection <= 4) { // Couple times a week
        frequencyString = `Rata-rata setiap ${Math.round(avgDaysPerReflection)} hari sekali`;
      } else if (avgDaysPerReflection <= 7.5 && period === "weekly") { // weekly for weekly view
        frequencyString = "Sekitar seminggu sekali";
      } else if (avgDaysPerReflection <= 10 && period === "monthly") { // weekly for monthly view
        frequencyString = "Sekitar seminggu sekali";
      } else if (avgDaysPerReflection <= 15 && period === "monthly") {
        frequencyString = "Sekitar 2 minggu sekali";
      }
       else {
        frequencyString = `Rata-rata setiap ${Math.round(avgDaysPerReflection)} hari sekali`;
      }
    }
    // More nuanced for very low frequency in monthly
    if (period === "monthly" && statsData.reflectionCount === 1 && statsData.totalDays === 30) {
        frequencyString = "Sebulan sekali";
    } else if (period === "monthly" && statsData.reflectionCount > 1 && statsData.reflectionCount < 4) {
        // If 2-3 times a month, keep the calculated "Rata-rata setiap X hari sekali"
        const avgDays = Math.round(statsData.totalDays / statsData.reflectionCount);
        frequencyString = `Rata-rata setiap ${avgDays} hari sekali`;
    }


    let motivationMessage = "";
    if (period === "weekly") {
      if (completionPercentage >= 80) {
        motivationMessage = "🔥 Luar biasa! Kamu sangat konsisten minggu ini!";
      } else if (completionPercentage >= 60) {
        motivationMessage = "👍 Bagus! Terus pertahankan konsistensi mingguanmu!";
      } else if (completionPercentage >= 40) {
        motivationMessage = "💪 Mulai baik! Coba tingkatkan lagi minggu ini ya!";
      } else {
        motivationMessage =
          "🌱 Yuk mulai lebih konsisten minggu ini! Setiap langkah kecil berarti.";
      }
    } else { // Monthly
      if (completionPercentage >= 75) { // Adjusted threshold for monthly
        motivationMessage = "🎉 Fantastis! Konsistensi bulananmu sangat baik!";
      } else if (completionPercentage >= 50) {
        motivationMessage = "✨ Keren! Jaga terus momentum refleksi bulananmu!";
      } else if (completionPercentage >= 25) {
        motivationMessage = "🙌 Sudah cukup baik! Teruslah berusaha membangun kebiasaan bulanan.";
      } else {
        motivationMessage =
          "🧗‍♀️ Refleksi bulanan adalah perjalanan. Jangan menyerah, teruslah mencoba!";
      }
    }

    const statsMessage =
      `📊 *Statistik Refleksi ${
        period === "weekly" ? "Mingguan" : "Bulanan"
      }*\n\n` +
      `🗓 *Periode:* ${statsData.totalDays} hari terakhir\n` +
      `📝 *Jumlah refleksi:* ${statsData.reflectionCount} dari ${statsData.totalDays} hari\n` +
      `📈 *Tingkat konsistensi:* ${completionPercentage}%\n` +
      `🔄 *Frekuensi refleksi:* ${frequencyString}\n` +
      `📏 *Rata-rata kata per hari:* ${statsData.averageWordsPerDay} kata\n` +
      `⭐ *Hari paling aktif:* ${statsData.mostActiveDay}\n\n` +
      (statsData.reflectionCount > 1 ? commonThemesText : "Refleksi minimal 2 untuk melihat tema umum.\n\n") +
      `🎯 *Motivasi:* ${motivationMessage}\n\n` +
      `💡 *Tips:* ${
        period === "weekly"
          ? "Konsistensi adalah kunci! Coba refleksi setiap hari meski hanya beberapa kalimat."
          : "Lihat gambaran besar progresmu! Refleksi bulanan membantumu melihat tren jangka panjang."
      }`;

    await ctx.reply(statsMessage, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📝 Refleksi Sekarang", callback_data: "start_reflection" },
            { text: "📊 Pilih Periode Lain", callback_data: "show_stats_ opnieuw" }, // "opnieuw" means again
          ],
          [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
        ],
      },
    });

     console.log(
      `📊 Stats view (${period}) sent to ${ctx.user.firstName || ctx.user.username} (${
        ctx.user.telegramId
      })`
    );

  } catch (error) { // Catch block for the main try-catch in sendStatsView
        console.error(`Error in sendStatsView (${period}):`, error);
        // Ensure loading message is deleted even if an error occurs later
        try {
            await ctx.deleteMessage(loadingMsg.message_id);
        } catch (delError) {
            console.error("Failed to delete loading message on error:", delError);
        }
        await ctx.reply(
            `❌ Maaf, terjadi kesalahan saat mengambil statistik ${
            period === "weekly" ? "mingguan" : "bulanan"
            }. Silakan coba lagi.`
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
      case "show_stats": // This will now show the period selection
      case "show_stats_opnieuw":
        await ctx.answerCbQuery("Pilih periode statistik...");
        // Edit message to show period selection or send new one if original message is too old to edit
        if (ctx.callbackQuery.message) {
            await ctx.editMessageText("📊 Pilih periode statistik yang ingin Anda lihat:", {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📅 Mingguan (7 hari)", callback_data: "show_weekly_stats" },
                            { text: "🗓 Bulanan (30 hari)", callback_data: "show_monthly_stats" },
                        ],
                        [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
                    ],
                },
            });
        } else {
            await statsCommand(ctx); // Fallback to sending a new message
        }
        break;
      case "show_weekly_stats":
        await ctx.answerCbQuery("Menampilkan statistik mingguan...");
        await sendStatsView(ctx, "weekly");
        break;
      case "show_monthly_stats":
        await ctx.answerCbQuery("Menampilkan statistik bulanan...");
        await sendStatsView(ctx, "monthly");
        break;
    }
  } catch (error) {
    console.error("Error handling stats callback:", error);
    await ctx.answerCbQuery("Terjadi kesalahan, silakan coba lagi");
  }
}
