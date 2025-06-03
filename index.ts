import { Telegraf } from "telegraf";
import { env } from "./src/utils/env-validation.js";
import { database, db } from "./src/utils/database.js";
import type { BotContext } from "./src/types/bot-context.js";

// Middleware imports
import { userAuthMiddleware } from "./src/middleware/user-auth.js";
import { errorHandlerMiddleware } from "./src/middleware/error-handler.js";
import { loggingMiddleware } from "./src/middleware/logging.js";
import { rateLimitingMiddleware } from "./src/middleware/rate-limiting.js";

// Command imports
import {
  startCommand,
  handleStartCallbacks,
} from "./src/commands/start-command.js";
import {
  helpCommand,
  handleHelpCallbacks,
} from "./src/commands/help-command.js";

/**
 * Initialize Satupersen Bot
 */
async function startBot(): Promise<void> {
  try {
    // Validate environment variables
    console.log("🔍 Validating environment variables...");

    // Test database connection
    console.log("🔗 Connecting to database...");
    await database.connect();

    // Initialize Telegraf bot
    console.log("🤖 Initializing Telegram bot...");
    const bot = new Telegraf<BotContext>(env.BOT_TOKEN);

    // Apply middleware in order
    bot.use(loggingMiddleware);
    bot.use(errorHandlerMiddleware);
    bot.use(rateLimitingMiddleware);

    // Attach database to context
    bot.use(async (ctx, next) => {
      ctx.db = db;
      await next();
    });

    // User authentication middleware
    bot.use(userAuthMiddleware);

    // Global error handling for uncaught bot errors
    bot.catch((err, ctx) => {
      console.error("❌ Uncaught bot error:", err);
      ctx.reply(
        "Maaf, terjadi kesalahan sistem. Tim teknis kami sedang menangani masalah ini."
      );
    });

    // Register commands
    bot.start(startCommand);
    bot.help(helpCommand);

    // Handle callback queries from inline keyboards
    bot.on("callback_query", async (ctx) => {
      try {
        await handleStartCallbacks(ctx);
        await handleHelpCallbacks(ctx);
      } catch (error) {
        console.error("❌ Error handling callback query:", error);
        await ctx.answerCbQuery("Terjadi kesalahan, silakan coba lagi");
      }
    });

    // Placeholder for /reflect command (Phase 3)
    bot.command("reflect", async (ctx) => {
      await ctx.reply(
        "📝 *Fitur Refleksi sedang dalam pengembangan*\n\n" +
          "Fitur refleksi dengan AI akan segera hadir di Phase 3! " +
          "Saat ini Anda dapat menggunakan /start dan /help untuk navigasi.",
        { parse_mode: "Markdown" }
      );
    });

    // Placeholder for /summary command (Phase 3)
    bot.command("summary", async (ctx) => {
      await ctx.reply(
        "📊 *Fitur Ringkasan sedang dalam pengembangan*\n\n" +
          "Fitur ini akan tersedia setelah sistem refleksi selesai.",
        { parse_mode: "Markdown" }
      );
    });

    // Placeholder for /stats command (Phase 4)
    bot.command("stats", async (ctx) => {
      await ctx.reply(
        "📈 *Fitur Statistik sedang dalam pengembangan*\n\n" +
          "Fitur ini akan tersedia di Phase 4 untuk analisis perkembangan Anda.",
        { parse_mode: "Markdown" }
      );
    });

    // Handle unknown commands
    bot.on("text", async (ctx) => {
      const message = ctx.message.text;
      if (message.startsWith("/")) {
        await ctx.reply(
          "❓ Perintah tidak dikenali.\n\n" +
            "Gunakan /help untuk melihat daftar perintah yang tersedia.",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📚 Lihat Panduan", callback_data: "show_help" }],
              ],
            },
          }
        );
      }
    });

    // Launch bot
    console.log("🚀 Starting Satupersen Bot...");
    await bot.launch();

    console.log("✅ Satupersen Bot is running with all Phase 2 features!");
    console.log("📋 Available features:");
    console.log("  • User authentication and registration");
    console.log("  • Rate limiting and error handling");
    console.log("  • Comprehensive logging");
    console.log("  • /start and /help commands");
    console.log("  • Inline keyboard navigation");

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      try {
        bot.stop(signal);
        await database.disconnect();
        console.log("👋 Bot stopped successfully");
        process.exit(0);
      } catch (error) {
        console.error("❌ Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.once("SIGINT", () => gracefulShutdown("SIGINT"));
    process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    process.exit(1);
  }
}

// Start the bot
startBot();
