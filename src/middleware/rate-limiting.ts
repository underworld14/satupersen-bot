import type { BotContext } from "../types/bot-context.js";

interface RateLimitEntry {
  count: number;
  lastReset: number;
}

/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 60000) {
    // 10 requests per minute by default
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if user is within rate limit
   */
  isAllowed(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.limits.get(userId);

    if (!userLimit) {
      this.limits.set(userId, { count: 1, lastReset: now });
      return true;
    }

    // Reset counter if window has passed
    if (now - userLimit.lastReset > this.windowMs) {
      userLimit.count = 1;
      userLimit.lastReset = now;
      return true;
    }

    // Check if under limit
    if (userLimit.count < this.maxRequests) {
      userLimit.count++;
      return true;
    }

    return false;
  }

  /**
   * Get remaining requests for user
   */
  getRemainingRequests(userId: string): number {
    const userLimit = this.limits.get(userId);
    if (!userLimit) return this.maxRequests;

    const now = Date.now();
    if (now - userLimit.lastReset > this.windowMs) {
      return this.maxRequests;
    }

    return Math.max(0, this.maxRequests - userLimit.count);
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    for (const [userId, entry] of this.limits.entries()) {
      if (now - entry.lastReset > this.windowMs * 2) {
        this.limits.delete(userId);
      }
    }
  }
}

// Global rate limiter instance
const globalRateLimiter = new RateLimiter();

// Cleanup every 10 minutes
setInterval(() => globalRateLimiter.cleanup(), 10 * 60 * 1000);

/**
 * Rate limiting middleware
 */
export async function rateLimitingMiddleware(
  ctx: BotContext,
  next: () => Promise<void>
): Promise<void> {
  if (!ctx.from) {
    return await next();
  }

  const userId = ctx.from.id.toString();

  if (!globalRateLimiter.isAllowed(userId)) {
    const remaining = globalRateLimiter.getRemainingRequests(userId);
    console.warn(`🚫 Rate limit exceeded for user ${userId}`);

    await ctx.reply(
      "⏰ Anda terlalu sering mengirim pesan. Silakan tunggu sebentar sebelum mencoba lagi.\n\n" +
        "Batas: 10 pesan per menit untuk menjaga kualitas layanan."
    );
    return;
  }

  await next();
}

/**
 * Stricter rate limiting for sensitive commands
 */
export async function strictRateLimitingMiddleware(
  ctx: BotContext,
  next: () => Promise<void>
): Promise<void> {
  if (!ctx.from) {
    return await next();
  }

  const strictLimiter = new RateLimiter(3, 60000); // 3 requests per minute
  const userId = ctx.from.id.toString();

  if (!strictLimiter.isAllowed(userId)) {
    console.warn(`🚫 Strict rate limit exceeded for user ${userId}`);

    await ctx.reply(
      "⏰ Perintah ini dibatasi maksimal 3 kali per menit. Silakan tunggu sebentar."
    );
    return;
  }

  await next();
}
