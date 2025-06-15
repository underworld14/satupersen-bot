import { Telegraf } from "telegraf";
import { env } from "./src/utils/env-validation.js";
import { database, db } from "./src/utils/database.js";
import { testAIConnection } from "./src/utils/ai-client.js";
import { ReflectionService } from "./src/services/reflection-service.js";
import { AnalyticsService } from "./src/services/analytics-service.js";
import { StreakService } from "./src/services/streak-service.js";
import { MilestoneService } from "./src/services/milestone-service.js";
import { HabitAnalysisService } from "./src/services/habit-analysis-service.js";
import { ProgressService } from "./src/services/progress-service.js";
import { EnhancedAIService } from "./src/services/enhanced-ai-service.js";
import type { BotContext } from "./src/types/bot-context.js";

// Middleware imports
import { userAuthMiddleware } from "./src/middleware/user-auth.js";
import { errorHandlerMiddleware } from "./src/middleware/error-handler.js";
import { loggingMiddleware } from "./src/middleware/logging.js";
import { rateLimitingMiddleware } from "./src/middleware/rate-limiting.js";

// Command imports
import { startCommand } from "./src/commands/start-command.js";
import { helpCommand } from "./src/commands/help-command.js";
import {
  reflectCommand,
  handleReflectionInput,
  isUserWaitingForReflection,
} from "./src/commands/reflect-command.js";
import { summaryCommand } from "./src/commands/summary-command.js";
import { statsCommand } from "./src/commands/stats-command.js";
import { streakCommand } from "./src/commands/streak-command.js";
import {
  habitsCommand,
  handleHabitFeedback,
} from "./src/commands/habits-command.js";
import { progressCommand } from "./src/commands/progress-command.js";

// Handler imports
import { handleCallbackQuery } from "./src/handlers/callback-handler.js";

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

    // Test AI connection
    console.log("🤖 Testing AI connection...");
    const aiConnected = await testAIConnection();
    if (!aiConnected) {
      throw new Error(
        "AI connection failed. Please check your GOOGLE_API_KEY."
      );
    }

    // Initialize Telegraf bot
    console.log("🤖 Initializing Telegram bot...");
    const bot = new Telegraf<BotContext>(env.BOT_TOKEN);

    // Apply middleware in order
    bot.use(loggingMiddleware);
    bot.use(errorHandlerMiddleware);
    bot.use(rateLimitingMiddleware);

    // Attach database and services to context
    bot.use(async (ctx, next) => {
      ctx.db = db;
      ctx.reflectionService = new ReflectionService(db);
      ctx.analyticsService = new AnalyticsService(db);
      ctx.streakService = new StreakService(db);
      ctx.milestoneService = new MilestoneService(db);
      ctx.habitAnalysisService = new HabitAnalysisService(db);
      ctx.progressService = new ProgressService(db);
      ctx.enhancedAIService = new EnhancedAIService(db);
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
    bot.command("reflect", reflectCommand);
    bot.command("summary", summaryCommand);
    bot.command("stats", statsCommand);
    bot.command("streak", streakCommand);
    bot.command("habits", habitsCommand);
    bot.command("progress", progressCommand);

    // Handle callback queries from inline keyboards
    bot.on("callback_query", handleCallbackQuery);

    // Handle habit feedback callbacks
    bot.action(/^habit_/, handleHabitFeedback);

    // Handle text messages for reflection input
    bot.on("text", async (ctx) => {
      const message = ctx.message.text;

      // Handle reflection input if user is waiting for it
      if (ctx.user && isUserWaitingForReflection(ctx.user.telegramId)) {
        await handleReflectionInput(ctx);
        return;
      }

      // Handle unknown commands
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

    console.log("✅ Satupersen Bot is running with Phase 2 features!");
    console.log("📋 Available features:");
    console.log("  • User authentication and registration");
    console.log("  • Rate limiting and error handling");
    console.log("  • Comprehensive logging");
    console.log("  • /start and /help commands");
    console.log("  • /reflect - AI-powered daily reflection");
    console.log("  • /summary - Today's reflection summary");
    console.log("  • /stats - Weekly reflection statistics");
    console.log("  • /streak - Streak tracking and motivation");
    console.log("  • /habits - Habit analysis and stacking suggestions");
    console.log("  • /progress - 1% better progress tracking");
    console.log("  • Milestone celebrations and streak recovery");
    console.log("  • Habit psychology integration");
    console.log("  • 🧠 Enhanced AI Integration with habit-aware prompts");
    console.log("  • 🎯 Adaptive AI responses based on user progress");
    console.log("  • 🎉 AI-powered milestone celebrations");
    console.log("  • 💡 Contextual habit stacking recommendations");
    console.log("  • Inline keyboard navigation");
    console.log("  • Google Gemini AI integration");

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
