import { Telegraf } from "telegraf";
import { env } from "./src/utils/env-validation.js";
import { database, db } from "./src/utils/database.js";
import type { BotContext } from "./src/types/bot-context.js";

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

    // Attach database to context
    bot.use(async (ctx, next) => {
      ctx.db = db;
      await next();
    });

    // Basic error handling
    bot.catch((err, ctx) => {
      console.error("❌ Bot error:", err);
      ctx.reply("Maaf, terjadi kesalahan. Silakan coba lagi nanti.");
    });

    // Temporary basic commands for Phase 1 testing
    bot.start((ctx) => {
      ctx.reply(
        "🌟 Selamat datang di Satupersen Bot!\n\nBot ini masih dalam tahap pengembangan."
      );
    });

    bot.help((ctx) => {
      ctx.reply(
        "📚 Bantuan Satupersen Bot:\n\n/start - Memulai bot\n/help - Menampilkan bantuan\n\nFitur lainnya sedang dalam pengembangan."
      );
    });

    // Launch bot
    console.log("🚀 Starting Satupersen Bot...");
    await bot.launch();

    console.log("✅ Satupersen Bot is running!");

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
