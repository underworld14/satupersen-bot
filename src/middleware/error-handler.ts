import type { BotContext } from "../types/bot-context.js";

/**
 * Global error handler middleware for Telegraf bot
 */
export async function errorHandlerMiddleware(
  ctx: BotContext,
  next: () => Promise<void>
): Promise<void> {
  try {
    await next();
  } catch (error) {
    console.error("❌ Bot error occurred:", error);

    // Log error details for debugging
    console.error("Error details:", {
      userId: ctx.user?.id || "unknown",
      telegramId: ctx.from?.id || "unknown",
      command:
        ctx.message && "text" in ctx.message ? ctx.message.text : "unknown",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });

    // Send user-friendly error message
    try {
      await ctx.reply(
        "🤖 Maaf, terjadi kesalahan teknis. Tim kami telah diberitahu dan akan segera memperbaikinya.\n\n" +
          "Silakan coba lagi dalam beberapa saat atau gunakan /help untuk melihat panduan."
      );
    } catch (replyError) {
      console.error("❌ Failed to send error message to user:", replyError);
    }
  }
}

/**
 * Specific error handlers for different types of errors
 */
export class BotError extends Error {
  constructor(
    message: string,
    public userMessage: string = "Terjadi kesalahan. Silakan coba lagi.",
    public code?: string
  ) {
    super(message);
    this.name = "BotError";
  }
}

export class DatabaseError extends BotError {
  constructor(message: string) {
    super(
      message,
      "Terjadi masalah dengan database. Silakan coba lagi dalam beberapa saat.",
      "DATABASE_ERROR"
    );
    this.name = "DatabaseError";
  }
}

export class ValidationError extends BotError {
  constructor(message: string, userMessage: string) {
    super(message, userMessage, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class AIError extends BotError {
  constructor(message: string) {
    super(
      message,
      "Layanan AI sedang tidak tersedia. Silakan coba lagi nanti.",
      "AI_ERROR"
    );
    this.name = "AIError";
  }
}
