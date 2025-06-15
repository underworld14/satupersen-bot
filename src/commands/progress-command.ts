import type { BotContext } from "../types/bot-context";

export async function progressCommand(ctx: BotContext): Promise<void> {
  try {
    const userId = ctx.user?.id;
    if (!userId) {
      await ctx.reply(
        "❌ Pengguna tidak ditemukan. Silakan gunakan /start terlebih dahulu."
      );
      return;
    }

    // Get user's progress data
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        currentStreak: true,
        reflections: {
          orderBy: { date: "desc" },
          take: 30, // Last 30 days for comprehensive analysis
          select: {
            date: true,
            moodScore: true,
            input: true,
          },
        },
      },
    });

    if (!user) {
      await ctx.reply("❌ Data pengguna tidak ditemukan.");
      return;
    }

    if (!user.reflections || user.reflections.length === 0) {
      await ctx.reply(
        "📝 **Mulai Journey Progress Kamu!**\n\n" +
          "Lakukan refleksi harian dengan /reflect untuk melihat:\n" +
          '• Progress "1% Better" harian\n' +
          "• Habit Maturity Meter\n" +
          "• Timeline kemajuan\n" +
          "• Analisis tren improvement\n\n" +
          '🌟 _"Progress, not perfection!"_'
      );
      return;
    }

    // Calculate progress metrics
    const daysSinceStart = Math.ceil(
      (new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const totalReflections = user.reflections.length;
    const consistencyScore = Math.min(
      100,
      (totalReflections / Math.min(daysSinceStart, 30)) * 100
    );

    // Calculate mood improvement
    const recentMoods = user.reflections
      .filter((r) => r.moodScore)
      .map((r) => r.moodScore!)
      .slice(0, 7); // Last 7 moods

    const earlierMoods = user.reflections
      .filter((r) => r.moodScore)
      .map((r) => r.moodScore!)
      .slice(7, 14); // Previous 7 moods

    const avgRecentMood =
      recentMoods.length > 0
        ? recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length
        : 0;

    const avgEarlierMood =
      earlierMoods.length > 0
        ? earlierMoods.reduce((a, b) => b + a, 0) / earlierMoods.length
        : avgRecentMood;

    const moodImprovement = avgRecentMood - avgEarlierMood;

    // Calculate engagement score based on reflection length
    const avgReflectionLength =
      user.reflections.reduce((sum, r) => sum + r.input.length, 0) /
      totalReflections;
    const engagementScore = Math.min(100, (avgReflectionLength / 100) * 100); // Assuming 100 chars = 100% engagement

    // Calculate cumulative progress (1% better formula)
    const cumulativeProgress = Math.min(
      100,
      consistencyScore * 0.4 +
        Math.min(100, Math.max(0, 50 + moodImprovement * 5)) * 0.3 +
        engagementScore * 0.2 +
        Math.min(10, user.currentStreak) * 1 // Streak bonus
    );

    // Calculate habit maturity (progress towards 66-day automation)
    const habitMaturity = Math.min(100, (user.currentStreak / 66) * 100);

    // Determine progress level
    let progressLevel = "";
    let progressEmoji = "";
    let nextLevelInfo = "";

    if (cumulativeProgress < 20) {
      progressLevel = "Pemula Refleksi";
      progressEmoji = "🌱";
      nextLevelInfo = 'Lanjutkan konsistensi untuk mencapai "Explorer Diri"';
    } else if (cumulativeProgress < 40) {
      progressLevel = "Explorer Diri";
      progressEmoji = "🔍";
      nextLevelInfo =
        'Tingkatkan kualitas refleksi untuk mencapai "Growth Seeker"';
    } else if (cumulativeProgress < 60) {
      progressLevel = "Growth Seeker";
      progressEmoji = "📈";
      nextLevelInfo = 'Pertahankan streak untuk mencapai "Habit Builder"';
    } else if (cumulativeProgress < 80) {
      progressLevel = "Habit Builder";
      progressEmoji = "🏗️";
      nextLevelInfo =
        'Sempurnakan konsistensi untuk mencapai "Master Transformer"';
    } else {
      progressLevel = "Master Transformer";
      progressEmoji = "👑";
      nextLevelInfo =
        "Kamu sudah mencapai level tertinggi! Pertahankan excellence ini!";
    }

    // Build progress message
    let message = `📊 **Progress Report - "1% Better Daily"**\n\n`;

    // Overall progress
    message += `${progressEmoji} **Level Kamu: ${progressLevel}**\n`;
    message += `🎯 Progress Kumulatif: **${Math.round(
      cumulativeProgress
    )}%**\n`;
    message += `📅 Hari aktif: ${daysSinceStart} hari\n\n`;

    // Progress breakdown
    message += `📈 **Analisis Progress:**\n`;
    message += `• Konsistensi: ${Math.round(
      consistencyScore
    )}% (${totalReflections}/${Math.min(daysSinceStart, 30)} hari)\n`;

    if (avgRecentMood > 0) {
      const moodTrend =
        moodImprovement > 2
          ? "📈 Meningkat"
          : moodImprovement < -2
          ? "📉 Menurun"
          : "➡️ Stabil";
      message += `• Mood Score: ${Math.round(
        avgRecentMood
      )}/100 ${moodTrend}\n`;
    }

    message += `• Engagement: ${Math.round(engagementScore)}% (avg ${Math.round(
      avgReflectionLength
    )} karakter)\n`;
    message += `• Streak Bonus: +${Math.min(10, user.currentStreak)} poin\n\n`;

    // Habit maturity meter
    message += `🏗️ **Habit Maturity Meter:**\n`;
    const maturityBars = Math.floor(habitMaturity / 10);
    const maturityBar =
      "🟩".repeat(maturityBars) + "⬜".repeat(10 - maturityBars);
    message += `${maturityBar} ${Math.round(habitMaturity)}%\n`;
    message += `📍 ${user.currentStreak}/66 hari (Habit Automation Target)\n\n`;

    // Visual progress timeline (last 7 days)
    message += `📅 **Timeline Progress (7 hari terakhir):**\n`;
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateOnly = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      const reflection = user.reflections.find((r) => {
        const rDate = new Date(
          r.date.getFullYear(),
          r.date.getMonth(),
          r.date.getDate()
        );
        return rDate.getTime() === dateOnly.getTime();
      });

      let dayEmoji = "⚪"; // No reflection
      if (reflection) {
        if (reflection.moodScore) {
          if (reflection.moodScore >= 80) dayEmoji = "🌟";
          else if (reflection.moodScore >= 60) dayEmoji = "😊";
          else if (reflection.moodScore >= 40) dayEmoji = "😐";
          else dayEmoji = "😔";
        } else {
          dayEmoji = "✅"; // Has reflection but no mood score
        }
      }

      last7Days.push(dayEmoji);
    }

    message += last7Days.join(" ") + "\n";
    message += `🌟=Excellent  😊=Good  😐=OK  😔=Tough  ✅=Reflected  ⚪=Missed\n\n`;

    // Next level guidance
    message += `🎯 **Next Level:**\n`;
    message += `${nextLevelInfo}\n\n`;

    // Motivational insights
    if (cumulativeProgress > 50) {
      message += `🎉 **Achievement Unlocked!**\n`;
      message += `Kamu sudah mencapai more than 50% progress! This is amazing consistency!\n\n`;
    }

    if (habitMaturity > 30) {
      message += `💪 **Habit Strength:**\n`;
      message += `Kebiasaan refleksi kamu sudah ${Math.round(
        habitMaturity
      )}% otomatis. Keep building!\n\n`;
    }

    // Daily improvement calculation
    const dailyImprovement = cumulativeProgress / Math.max(1, daysSinceStart);
    message += `📊 **"1% Better" Analysis:**\n`;
    message += `• Daily improvement rate: ${dailyImprovement.toFixed(3)}%\n`;
    message += `• Projected 30-day progress: +${(dailyImprovement * 30).toFixed(
      1
    )}%\n`;
    message += `• On track to reach: ${Math.min(
      100,
      cumulativeProgress + dailyImprovement * 30
    ).toFixed(0)}% dalam sebulan\n\n`;

    message += `🚀 _"Success is the sum of small efforts repeated day in and day out." - Robert Collier_`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in progress command:", error);
    await ctx.reply(
      "❌ Terjadi kesalahan saat menghitung progress. Silakan coba lagi nanti."
    );
  }
}
