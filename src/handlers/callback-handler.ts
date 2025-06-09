import type { BotContext } from "../types/bot-context.js";
import {
  cancelReflection,
  reflectCommand,
} from "../commands/reflect-command.js";
import { helpCommand } from "../commands/help-command.js";
import { summaryCommand } from "../commands/summary-command.js";
import { sendStatsView, statsCommand } from "../commands/stats-command.js";
import { startCommand } from "../commands/start-command.js";

type CallbackHandler = (ctx: BotContext) => Promise<void>;

const callbackHandlers = new Map<string, CallbackHandler>([
  [
    "start_reflection",
    async (ctx) => {
      await ctx.answerCbQuery("Memulai refleksi...");
      await reflectCommand(ctx);
    },
  ],
  [
    "show_help",
    async (ctx) => {
      await ctx.answerCbQuery("Menampilkan panduan...");
      await helpCommand(ctx);
    },
  ],
  ["cancel_reflection", cancelReflection],
  [
    "show_summary",
    async (ctx) => {
      await ctx.answerCbQuery("Menampilkan ringkasan...");
      await summaryCommand(ctx);
    },
  ],
  [
    "show_stats",
    async (ctx) => {
      await ctx.answerCbQuery("Menampilkan statistik...");
      await statsCommand(ctx);
    },
  ],
  [
    "show_weekly_stats",
    async (ctx) => {
      await ctx.answerCbQuery("Menghitung statistik mingguan...");
      await sendStatsView(ctx, "weekly");
    },
  ],
  [
    "show_monthly_stats",
    async (ctx) => {
      await ctx.answerCbQuery("Menghitung statistik bulanan...");
      await sendStatsView(ctx, "monthly");
    },
  ],
  [
    "back_to_start",
    async (ctx) => {
      await ctx.answerCbQuery("Kembali ke menu utama...");
      await startCommand(ctx);
    },
  ],
]);

export async function handleCallbackQuery(ctx: BotContext): Promise<void> {
  if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) {
    return;
  }

  const callbackData = ctx.callbackQuery.data;
  const handler = callbackHandlers.get(callbackData);

  if (handler) {
    try {
      await handler(ctx);
    } catch (error) {
      console.error(`❌ Error handling callback: ${callbackData}`, error);
      await ctx.answerCbQuery("Terjadi kesalahan, silakan coba lagi");
    }
  } else {
    // Default fallback for unknown callbacks
    await ctx.answerCbQuery("Perintah tidak dikenali");
  }
}
