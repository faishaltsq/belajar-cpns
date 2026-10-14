interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window rate limiter (used as fallback when DB is unreachable)
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
 * In-memory rate limit check (legacy fallback).
 * Used when the DB store is unavailable — fails open so DB issues never lock out users.
 */
export function checkRateLimitMemory(
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

/**
 * DB-backed sliding window. One atomic statement per check:
 * prunes hits older than the window, appends the new hit, returns the
 * post-write array. Fails OPEN to the memory store on any DB error —
 * rate limiting must never lock users out because of a DB hiccup.
 */
export async function checkRateLimitDb(
  key: string,
  limit = 10,
  windowSeconds = 60
): Promise<{ success: boolean; remaining: number; retryAfterSeconds: number }> {
  const { getDb } = await import('@/lib/db');
  const sql = getDb();
  if (!sql) return checkRateLimitMemory(key, limit, windowSeconds);
  try {
    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;

    const rows = await sql`
      INSERT INTO rate_limits (key, timestamps, updated_at)
      VALUES (${key}, ARRAY[${now}]::BIGINT[], now())
      ON CONFLICT (key) DO UPDATE SET
        timestamps = COALESCE(
          (SELECT array_agg(t ORDER BY t) FROM unnest(rate_limits.timestamps) AS t WHERE t > ${cutoff}),
          ARRAY[]::BIGINT[]
        ) || ARRAY[${now}]::BIGINT[],
        updated_at = now()
      RETURNING timestamps
    `;

    const ts = (rows?.[0]?.timestamps ?? []) as number[];
    const active = ts.filter((t: number) => t > cutoff);

    // Opportunistic cleanup of long-dead rows (~5% of checks)
    if (Math.random() < 0.05) {
      sql`DELETE FROM rate_limits WHERE updated_at < now() - INTERVAL '2 hours'`.catch(() => {});
    }

    if (active.length > limit) {
      const oldest = Math.min(...active);
      const retryAfter = Math.max(1, Math.ceil((oldest + windowSeconds * 1000 - now) / 1000));
      return { success: false, remaining: 0, retryAfterSeconds: retryAfter };
    }
    return { success: true, remaining: Math.max(0, limit - active.length), retryAfterSeconds: 0 };
  } catch (err) {
    console.error('[rateLimit] DB store unavailable, failing open to memory:', err);
    return checkRateLimitMemory(key, limit, windowSeconds);
  }
}

/**
 * Unified entry point — async; same return shape as before.
 * All 6 auth-route callers must `await` this.
 */
export async function checkRateLimit(
  key: string,
  limit = 10,
  windowSeconds = 60
): Promise<{ success: boolean; remaining: number; retryAfterSeconds: number }> {
  return checkRateLimitDb(key, limit, windowSeconds);
}

/**
 * Client IP as observed by the trusted edge proxy (Vercel).
 * Vercel APPENDS the real client IP to the END of x-forwarded-for, so the
 * LAST hop is the only spoof-proof value. Earlier hops are client-supplied.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded.split(',').map(h => h.trim()).filter(Boolean);
    if (hops.length > 0) {
      return hops[hops.length - 1];
    }
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}
