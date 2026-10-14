import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => mockSql),
}));

import { checkRateLimitDb } from '@/lib/rateLimit';

describe('DB-backed rate limit store', () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it('allows when DB returns array under limit', async () => {
    const now = Date.now();
    // mock DB returning 2 recent timestamps (the INSERT appended inside SQL)
    mockSql.mockResolvedValue([{ timestamps: [now - 1000, now - 500] }]);
    const r = await checkRateLimitDb('login:1.2.3.4', 10, 60);
    expect(r.success).toBe(true);
    expect(r.remaining).toBe(8);
  });

  it('blocks when DB returns array at/over limit', async () => {
    const arr = Array.from({ length: 11 }, (_, i) => Date.now() - i * 1000);
    mockSql.mockResolvedValue([{ timestamps: arr }]);
    const r = await checkRateLimitDb('login:1.2.3.4', 10, 60);
    expect(r.success).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('FAILS OPEN to memory fallback when DB throws', async () => {
    mockSql.mockRejectedValue(new Error('neon cold start'));
    const r = await checkRateLimitDb('login:1.2.3.4', 10, 60);
    expect(r.success).toBe(true);
  });

  it('FAILS OPEN when DB not configured (getDb null)', async () => {
    const dbMod = await import('@/lib/db');
    vi.mocked(dbMod.getDb).mockReturnValueOnce(null as any);
    const r = await checkRateLimitDb('login:1.2.3.4', 10, 60);
    expect(r.success).toBe(true);
  });

  it('returns the legacy shape { success, remaining, retryAfterSeconds }', async () => {
    mockSql.mockResolvedValue([{ timestamps: [1] }]);
    const r = await checkRateLimitDb('login:1.2.3.4', 10, 60);
    expect(r).toHaveProperty('success');
    expect(r).toHaveProperty('remaining');
    expect(r).toHaveProperty('retryAfterSeconds');
  });
});
