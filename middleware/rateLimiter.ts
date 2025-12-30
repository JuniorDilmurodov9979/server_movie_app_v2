// server/middleware/rateLimiter.ts
import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

// In-memory storage for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

const REQUESTS_PER_DAY = 20;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Clean up expired entries every hour
setInterval(() => {
  const now = new Date();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Run every hour

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Get client IP (handles proxies)
  const ip =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.socket.remoteAddress ||
    "unknown";

  const clientIp = Array.isArray(ip) ? ip[0] : ip;

  const now = new Date();
  const entry = rateLimitStore.get(clientIp);

  // If no entry or reset time has passed, create new entry
  if (!entry || entry.resetAt < now) {
    const resetAt = new Date(now.getTime() + WINDOW_MS);
    rateLimitStore.set(clientIp, {
      count: 1,
      resetAt,
    });

    // Add rate limit headers
    res.setHeader("X-RateLimit-Limit", REQUESTS_PER_DAY);
    res.setHeader("X-RateLimit-Remaining", REQUESTS_PER_DAY - 1);
    res.setHeader("X-RateLimit-Reset", resetAt.toISOString());

    return next();
  }

  // Check if limit exceeded
  if (entry.count >= REQUESTS_PER_DAY) {
    const resetInSeconds = Math.ceil(
      (entry.resetAt.getTime() - now.getTime()) / 1000
    );
    const resetInHours = Math.ceil(resetInSeconds / 3600);

    res.setHeader("X-RateLimit-Limit", REQUESTS_PER_DAY);
    res.setHeader("X-RateLimit-Remaining", 0);
    res.setHeader("X-RateLimit-Reset", entry.resetAt.toISOString());
    res.setHeader("Retry-After", resetInSeconds.toString());

    return res.status(429).json({
      error: "Rate limit exceeded",
      message: `You've reached the daily limit of ${REQUESTS_PER_DAY} requests. Try again in ${resetInHours} hour${
        resetInHours !== 1 ? "s" : ""
      }.`,
      limit: REQUESTS_PER_DAY,
      resetAt: entry.resetAt.toISOString(),
      retryAfter: resetInSeconds,
    });
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(clientIp, entry);

  // Add rate limit headers
  res.setHeader("X-RateLimit-Limit", REQUESTS_PER_DAY);
  res.setHeader("X-RateLimit-Remaining", REQUESTS_PER_DAY - entry.count);
  res.setHeader("X-RateLimit-Reset", entry.resetAt.toISOString());

  next();
}

// Optional: Export function to check rate limit status without incrementing
export function checkRateLimit(ip: string): {
  remaining: number;
  resetAt: Date | null;
  isLimited: boolean;
} {
  const entry = rateLimitStore.get(ip);
  const now = new Date();

  if (!entry || entry.resetAt < now) {
    return {
      remaining: REQUESTS_PER_DAY,
      resetAt: null,
      isLimited: false,
    };
  }

  return {
    remaining: Math.max(0, REQUESTS_PER_DAY - entry.count),
    resetAt: entry.resetAt,
    isLimited: entry.count >= REQUESTS_PER_DAY,
  };
}
