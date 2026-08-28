import type { H3Event } from "h3";
import { createError, getRequestIP } from "#imports";

type AttemptBucket = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, AttemptBucket>();

export function assertRateLimit(event: H3Event, keyPrefix: string) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 8;
  const current = attempts.get(key);

  if (!current || now > current.resetAt) {
    attempts.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (current.count >= maxAttempts) {
    throw createError({
      statusCode: 429,
      statusMessage: "Terlalu banyak percobaan. Coba lagi sebentar lagi.",
    });
  }

  current.count += 1;
}
