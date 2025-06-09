import type { BotContext } from "../types/bot-context.js";

/**
 * Session storage for users waiting for reflection input
 * In production, this should be replaced with a proper session store
 */
const userSessions = new Map<string, { waitingForReflection: boolean }>();

/**
 * /reflect command handler
 * Initiates the reflection process for daily input
 */
export async function reflectCommand(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.user) {
      await ctx.reply("❌ User tidak ditemukan. Silakan mulai dengan /start");
      return;
    }

    // Check if user has already reflected today
    const hasReflected = await ctx.reflectionService.hasReflectedToday(
      ctx.user.id
    );

    if (hasReflected) {
      await ctx.reply(
        "🎉 *Keren! Kamu sudah refleksi hari ini!*\n\n" +
          "Konsistensi adalah kunci sukses. Sampai jumpa besok untuk refleksi selanjutnya! 💪\n\n" +
          "📊 Mau lihat ringkasan hari ini?",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📊 Lihat Ringkasan", callback_data: "show_summary" }],
              [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
            ],
          },
        }
      );
      return;
    }

    // Set user session state
    userSessions.set(ctx.user.telegramId, { waitingForReflection: true });

    await ctx.reply(
      "✨ *Halo! Yuk refleksi hari ini* ✨\n\n" +
        "Ceritakan apa saja yang terjadi hari ini - pencapaian, tantangan, perasaan, atau apapun yang ingin kamu bagi.\n\n" +
        "💭 Tidak perlu sempurna, yang penting jujur dan dari hati. Keluh kesah juga boleh banget!\n\n" +
        "📝 *Tulis refleksi kamu:*",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Batalkan", callback_data: "cancel_reflection" }],
          ],
        },
      }
    );

    console.log(
      `📝 /reflect command initiated by ${
        ctx.user.firstName || ctx.user.username
      } (${ctx.user.telegramId})`
    );
  } catch (error) {
    console.error("Error in reflect command:", error);
    await ctx.reply(
      "❌ Maaf, terjadi kesalahan saat memulai refleksi. Silakan coba lagi."
    );
  }
}

/**
 * Handle user's reflection input
 */
export async function handleReflectionInput(ctx: BotContext): Promise<void> {
  if (!ctx.user || !ctx.message || !("text" in ctx.message)) {
    return;
  }

  const session = userSessions.get(ctx.user.telegramId);
  if (!session?.waitingForReflection) {
    return; // User is not in reflection mode
  }

  try {
    const userInput = ctx.message.text;

    // Clear session state
    userSessions.delete(ctx.user.telegramId);

    // Show loading message
    const loadingMsg = await ctx.reply(
      "🤖 Lagi menganalisis refleksi kamu...\n\n✨ Sebentar ya, lagi nyiapin insight yang bagus!"
    );

    // Process reflection
    const { reflection, aiSummary } =
      await ctx.reflectionService.createReflection(ctx.user.id, userInput);

    // Delete loading message
    try {
      await ctx.deleteMessage(loadingMsg.message_id);
    } catch {
      // Ignore if deletion fails
    }

    // Send success message with AI analysis (no special formatting to avoid parsing errors)
    const successMessage = `✅ Refleksi berhasil disimpan!\n\n${aiSummary}`;

    // Split long messages if needed
    if (successMessage.length > 4000) {
      const chunks = [];
      let currentChunk = "✅ Refleksi berhasil disimpan!\n\n";
      const words = aiSummary.split(" ");

      for (const word of words) {
        if ((currentChunk + word + " ").length > 4000) {
          chunks.push(currentChunk.trim());
          currentChunk = word + " ";
        } else {
          currentChunk += word + " ";
        }
      }

      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      // Send chunks
      for (let i = 0; i < chunks.length; i++) {
        const isLastChunk = i === chunks.length - 1;
        const chunk = chunks[i];
        if (!chunk) continue;
        await ctx.reply(chunk, {
          reply_markup: isLastChunk
            ? {
                inline_keyboard: [
                  [
                    { text: "📊 Lihat Statistik", callback_data: "show_stats" },
                    {
                      text: "📝 Refleksi Lagi",
                      callback_data: "start_reflection",
                    },
                  ],
                  [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
                ],
              }
            : undefined,
        });

        // Small delay between chunks
        if (!isLastChunk) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } else {
      // Send as single message
      await ctx.reply(successMessage, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📊 Lihat Statistik", callback_data: "show_stats" },
              { text: "📝 Refleksi Lagi", callback_data: "start_reflection" },
            ],
            [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
          ],
        },
      });
    }

    console.log(
      `✅ Reflection processed successfully for user ${ctx.user.telegramId} - Reflection ID: ${reflection.id}`
    );
  } catch (error) {
    console.error("Error processing reflection:", error);

    // Clear session state on error
    userSessions.delete(ctx.user.telegramId);

    if (error instanceof Error) {
      await ctx.reply(`❌ ${error.message}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Coba Lagi", callback_data: "start_reflection" }],
            [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
          ],
        },
      });
    } else {
      await ctx.reply(
        "❌ Maaf, terjadi kesalahan saat memproses refleksi. Silakan coba lagi.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Coba Lagi", callback_data: "start_reflection" }],
              [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
            ],
          },
        }
      );
    }
  }
}

/**
 * Cancels the current reflection flow for a user.
 * Deletes the user's session and sends a confirmation message.
 * @param ctx - The bot context.
 */
export async function cancelReflection(ctx: BotContext): Promise<void> {
  if (ctx.user) {
    userSessions.delete(ctx.user.telegramId);
  }
  await ctx.answerCbQuery("Refleksi dibatalkan");
  await ctx.reply(
    "👋 Oke, refleksi dibatalkan.\n\nTenang aja, kamu bisa mulai lagi kapan saja dengan /reflect!",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🏠 Menu Utama", callback_data: "back_to_start" }],
        ],
      },
    }
  );
}

/**
 * Check if user is in reflection input mode
 */
export function isUserWaitingForReflection(telegramId: string): boolean {
  return userSessions.get(telegramId)?.waitingForReflection || false;
}
