import type { BotContext } from "../types/bot-context.js";

/**
 * Logging middleware to track bot interactions
 */
export async function loggingMiddleware(
  ctx: BotContext,
  next: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();

  // Extract relevant information for logging
  const logInfo = {
    userId: ctx.from?.id,
    username: ctx.from?.username || ctx.from?.first_name || "Unknown",
    chatType: ctx.chat?.type,
    messageType: getMessageType(ctx),
    command: getCommand(ctx),
    timestamp: new Date().toISOString(),
  };

  console.log(
    `📝 Incoming: ${logInfo.messageType} from ${logInfo.username} (${logInfo.userId})`
  );

  if (logInfo.command) {
    console.log(`🎯 Command: ${logInfo.command}`);
  }

  try {
    await next();

    const duration = Date.now() - startTime;
    console.log(`✅ Processed in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error after ${duration}ms:`, error);
    throw error; // Re-throw to let error handler deal with it
  }
}

/**
 * Determine the type of message
 */
function getMessageType(ctx: BotContext): string {
  if (ctx.message) {
    if ("text" in ctx.message) return "text";
    if ("photo" in ctx.message) return "photo";
    if ("document" in ctx.message) return "document";
    if ("voice" in ctx.message) return "voice";
    if ("sticker" in ctx.message) return "sticker";
    return "other_message";
  }

  if (ctx.callbackQuery) return "callback_query";
  if (ctx.inlineQuery) return "inline_query";

  return "unknown";
}

/**
 * Extract command from message if it's a command
 */
function getCommand(ctx: BotContext): string | null {
  if (ctx.message && "text" in ctx.message) {
    const text = ctx.message.text;
    if (text && text.startsWith("/")) {
      return text.split(" ")[0];
    }
  }
  return null;
}

/**
 * Enhanced logging for development environment
 */
export async function devLoggingMiddleware(
  ctx: BotContext,
  next: () => Promise<void>
): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 Development Debug Info:", {
      update: ctx.update,
      user: ctx.user
        ? {
            id: ctx.user.id,
            telegramId: ctx.user.telegramId,
            username: ctx.user.username,
          }
        : "not_authenticated",
    });
  }

  await next();
}
