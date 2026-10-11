interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window rate limiter
const memoryStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired entries
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    memoryStore.forEach((record, key) => {
      if (record.resetAt <= now) {
        memoryStore.delete(key);
      }
    });
  }, 5 * 60 * 1000);
  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }
}

/**
 * Check rate limit for an action/IP
 * @param key unique action identifier (e.g. `login:${ip}`)
 * @param limit max allowed requests in window
 * @param windowSeconds time window in seconds
 */
export function checkRateLimit(
  key: string,
  limit = 10,
  windowSeconds = 60
): { success: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = memoryStore.get(key);

  if (!record || record.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { success: false, remaining: 0, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count, retryAfterSeconds: 0 };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}
