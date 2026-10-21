// tests/entitlement-gate.test.ts
//
// Regression suite for the server-side paywall (src/lib/entitlement.ts).
//
// Premium access used to be a drawing on a card: `/api/questions/[id]`,
// `/api/results` and `/api/drill/check` handed any package to any visitor, so
// a paid tryout was one `curl` away and the leaderboard accepted forged scores
// for packages the caller had never bought. These tests pin the gate itself
// (the decision table) and the wiring of each route that consumes it.
//
// Package fixture: FREE_PACKAGE_IDS is tryout-mini / tryout-1 / tryout-2, so
// `tryout-3` is the cheapest paid id that actually exists in src/data/packages.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
  isDbConnected: vi.fn(async () => true),
  saveExamResult: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
  getPackageLeaderboard: vi.fn(),
}));

const mockCookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({ cookies: () => mockCookieStore }));

const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({ verifyToken: (...a: unknown[]) => mockVerifyToken(...a) }));

// The gate must be exercised without a shared in-memory limiter deciding the
// outcome, and the client ip must be stable across cases.
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn(async () => ({ success: true, remaining: 100, resetAt: Date.now() + 1000 })),
  getClientIp: vi.fn(() => 'test-ip'),
}));

import { saveExamResult } from '@/lib/db';
import { GET as questionsGet } from '@/app/api/questions/[id]/route';
import { POST as resultsPost } from '@/app/api/results/route';
import { POST as drillCheckPost } from '@/app/api/drill/check/route';
import { checkPackageAccess, packageCacheControl } from '@/lib/entitlement';

const FREE_ID = 'tryout-1';
const PAID_ID = 'tryout-3';

function jsonReq(path: string, body: unknown): NextRequest {
  return new NextRequest(`https://lolosin.com${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function questionsReq(id: string): NextRequest {
  return new NextRequest(`https://lolosin.com/api/questions/${id}`);
}

/** A signed-in visitor: the cookie exists and the JWT verifies. */
function signInAs(userId: string) {
  mockCookieStore.get.mockImplementation((name: string) =>
    name === 'cpns_token' ? { name, value: 'valid-token' } : undefined
  );
  mockVerifyToken.mockResolvedValue({ userId, email: `${userId}@example.test` });
}

/**
 * Rows the entitlement SELECT returns for the signed-in user.
 *
 * Table-keyed rather than a blanket `mockResolvedValue`, because `loadPackage`
 * also goes through `getDb()` — handing it a `users` row produces a question
 * without options and fails the payload mapper instead of the assertion.
 */
function userRow(isPro: boolean, unlocked: string[] = []) {
  mockSql.mockImplementation((strings: TemplateStringsArray | string[], ..._v: unknown[]) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    if (/\busers\b/i.test(text)) {
      return Promise.resolve([{ is_pro: isPro, unlocked_packages: unlocked }]);
    }
    return Promise.resolve([]);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: guest, and a database that answers with nothing.
  mockCookieStore.get.mockReturnValue(undefined);
  mockVerifyToken.mockResolvedValue(null);
  mockSql.mockResolvedValue([]);
});

// ─────────────────────────────────────────────────────────────────────────────
// The decision table
// ─────────────────────────────────────────────────────────────────────────────

describe('checkPackageAccess — decision table', () => {
  it('opens a free package with no cookie and no database round-trip', async () => {
    const decision = await checkPackageAccess(FREE_ID);
    expect(decision).toEqual({ allowed: true, free: true });
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('asks a guest to sign in before a paid package', async () => {
    const decision = await checkPackageAccess(PAID_ID);
    expect(decision).toEqual({ allowed: false, reason: 'login_required' });
  });

  it('treats an id outside the published catalog as paid, never as free', async () => {
    const decision = await checkPackageAccess('custom-do-not-exist');
    expect(decision).toEqual({ allowed: false, reason: 'login_required' });
  });

  it('opens a paid package for a PRO account', async () => {
    signInAs('u-pro');
    userRow(true);
    const decision = await checkPackageAccess(PAID_ID);
    expect(decision).toEqual({ allowed: true, free: false });
  });

  it('opens only the purchased package for a non-PRO account', async () => {
    signInAs('u-buyer');
    userRow(false, [PAID_ID]);
    expect(await checkPackageAccess(PAID_ID)).toEqual({ allowed: true, free: false });
    expect(await checkPackageAccess('tryout-4')).toEqual({
      allowed: false,
      reason: 'payment_required',
    });
  });

  it('refuses a signed-in non-buyer, distinguishing paid from login-required', async () => {
    signInAs('u-free');
    userRow(false, []);
    const decision = await checkPackageAccess(PAID_ID);
    expect(decision).toEqual({ allowed: false, reason: 'payment_required' });
  });

  it('treats an expired token as a guest instead of as a paying user', async () => {
    mockCookieStore.get.mockReturnValue({ name: 'cpns_token', value: 'stale' });
    mockVerifyToken.mockResolvedValue(null); // expired / forged
    const decision = await checkPackageAccess(PAID_ID);
    expect(decision).toEqual({ allowed: false, reason: 'login_required' });
  });

  it('never stores a paid payload at the edge', () => {
    expect(packageCacheControl({ allowed: true, free: false })).toBe('private, no-store');
    expect(packageCacheControl({ allowed: true, free: true })).toContain('public');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Route wiring
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/questions/[id] — entitlement gate', () => {
  it('403s a paid package for a guest instead of serving it', async () => {
    const res = await questionsGet(questionsReq(PAID_ID) as never, {
      params: { id: PAID_ID },
    } as never);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe('login_required');
    expect(body.questions).toBeUndefined();
  });

  it('403s an unpublished package id for a guest', async () => {
    const res = await questionsGet(questionsReq('custom-do-not-exist') as never, {
      params: { id: 'custom-do-not-exist' },
    } as never);
    expect(res.status).toBe(403);
  });

  it('keeps a free package reachable for guests (guest-first learning)', async () => {
    const res = await questionsGet(questionsReq(FREE_ID) as never, {
      params: { id: FREE_ID },
    } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.questions)).toBe(true);
    expect(body.questions.length).toBeGreaterThan(0);
  });

  it('strips the answer key from the free payload it does serve', async () => {
    const res = await questionsGet(questionsReq(FREE_ID) as never, {
      params: { id: FREE_ID },
    } as never);
    const body = await res.json();
    expect(body.questions[0].options[0]).not.toHaveProperty('score');
    expect(body.questions[0]).not.toHaveProperty('explanation');
  });

  it('serves a paid package to a PRO account with a non-cacheable header', async () => {
    signInAs('u-pro');
    userRow(true);
    const res = await questionsGet(questionsReq(PAID_ID) as never, {
      params: { id: PAID_ID },
    } as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('refuses a paid package the signed-in account has not unlocked', async () => {
    signInAs('u-free');
    userRow(false, []);
    const res = await questionsGet(questionsReq(PAID_ID) as never, {
      params: { id: PAID_ID },
    } as never);
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('payment_required');
  });
});

describe('POST /api/results — entitlement gate and practice submissions', () => {
  it('refuses a paid submission before it scores or stores anything', async () => {
    const res = await resultsPost(
      jsonReq('/api/results', { packageId: PAID_ID, answers: {}, durationUsed: 1 }) as never
    );
    expect(res.status).toBe(403);
    expect(saveExamResult).not.toHaveBeenCalled();
    expect((await res.json()).reason).toBe('login_required');
  });

  it('scores a practice submission but never writes it to the leaderboard', async () => {
    // Practice mode has no column on `exam_results` to mark a row as unofficial,
    // so persisting it would put a Latihan Mandiri score on the official ranking.
    const res = await resultsPost(
      jsonReq('/api/results', {
        packageId: FREE_ID,
        answers: {},
        durationUsed: 1,
        practice: true,
      }) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(saveExamResult).not.toHaveBeenCalled();
    expect(body.id).toBeNull();
    expect(typeof body.result?.totalScore).toBe('number');
    expect(Number.isFinite(body.result?.totalScore)).toBe(true);
  });

  it('returns the review payload for a practice submission so its results page works', async () => {
    const res = await resultsPost(
      jsonReq('/api/results', {
        packageId: FREE_ID,
        answers: {},
        durationUsed: 1,
        practice: true,
      }) as never
    );
    const body = await res.json();
    expect(Array.isArray(body.review)).toBe(true);
    expect(body.review.length).toBeGreaterThan(0);
    // The key travels with the review, and only with the review.
    expect(body.review[0].options[0]).toHaveProperty('score');
    expect(typeof body.review[0].explanation).toBe('string');
    expect(body.questions).toBeUndefined();
  });

  it('still persists an official submission for the session account', async () => {
    vi.mocked(saveExamResult).mockResolvedValue('r1');
    signInAs('u-buyer');
    const res = await resultsPost(
      jsonReq('/api/results', { packageId: FREE_ID, answers: {}, durationUsed: 1 }) as never
    );
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe('r1');
    expect(saveExamResult).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveExamResult).mock.calls[0][0].userId).toBe('u-buyer');
  });

  it('ignores a forged totalScore regardless of the mode', async () => {
    vi.mocked(saveExamResult).mockResolvedValue('r2');
    const res = await resultsPost(
      jsonReq('/api/results', {
        packageId: FREE_ID,
        answers: {},
        durationUsed: 1,
        totalScore: 600,
        isPassed: true,
      }) as never
    );
    const stored = vi.mocked(saveExamResult).mock.calls[0][0];
    expect(stored.totalScore).toBeLessThan(600);
    expect(stored.isPassed).toBe(false);
    expect((await res.json()).result.totalScore).toBeLessThan(600);
  });
});

describe('POST /api/drill/check — answer-key oracle', () => {
  it('keeps a free question readable without a login (drill is a free feature)', async () => {
    const res = await drillCheckPost(
      jsonReq('/api/drill/check', {
        packageId: FREE_ID,
        questionId: 1,
        selectedOptionId: 'A',
      }) as never
    );
    // 200 = answered the key; 404 = that question id is not in the fixture.
    expect([200, 404]).toContain(res.status);
  });

  it('refuses a paid question key for a guest', async () => {
    const res = await drillCheckPost(
      jsonReq('/api/drill/check', {
        packageId: PAID_ID,
        questionId: 1,
        selectedOptionId: 'A',
      }) as never
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe('login_required');
    expect(body.correctOptionId).toBeUndefined();
    expect(body.explanation).toBeUndefined();
  });
});
