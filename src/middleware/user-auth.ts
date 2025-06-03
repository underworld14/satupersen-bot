import type { BotContext } from "../types/bot-context.js";
import { getOrCreateUser } from "../services/user-service.js";

/**
 * User authentication middleware
 * Automatically creates or retrieves user from database and attaches to context
 */
export async function userAuthMiddleware(
  ctx: BotContext,
  next: () => Promise<void>
): Promise<void> {
  try {
    if (!ctx.from) {
      console.warn("⚠️ No user information in context");
      return await next();
    }

    // Get or create user in database
    ctx.user = await getOrCreateUser({
      telegramId: ctx.from.id.toString(),
      username: ctx.from.username,
      firstName: ctx.from.first_name,
    });

    const userName =
      ctx.user?.firstName ||
      ctx.user?.username ||
      ctx.user?.telegramId ||
      "Unknown";
    console.log(`👤 User authenticated: ${userName}`);

    return await next();
  } catch (error) {
    console.error("❌ User authentication failed:", error);

    // Don't block the request, just log the error and continue without user context
    console.warn("⚠️ Continuing without user authentication");
    return await next();
  }
}
