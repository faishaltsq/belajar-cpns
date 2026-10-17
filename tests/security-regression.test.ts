/**
 * Security regression suite — OWASP Top 10 (2025) negative paths.
 *
 * Tests are split in two:
 *   it(...)       — controls that ALREADY hold. A failure means a regression.
 *   it.fails(...) — vulnerabilities CONFIRMED in the audit, each with its ID.
 *                   `it.fails` keeps `npm test` green while pinning the exploit.
 *                   When a fix lands, vitest reports it as failing (because it
 *                   unexpectedly passed) — delete the `it.fails` wrapper and keep
 *                   the body as a normal `it(...)`. Never re-pin by deleting the
 *                   assertion.
 *
 * Findings reference: docs/security-audit-2026-10-16.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as FsModule from 'fs';
import { GET as questionsGet } from '@/app/api/questions/[id]/route';
import { POST as resultsPost } from '@/app/api/results/route';
import { POST as webhookPost } from '@/app/api/webhooks/klikqris/route';
import { POST as uploadPost } from '@/app/api/admin/upload/route';
import { POST as packagesPost } from '@/app/api/admin/packages/route';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { GET as orderStatusGet } from '@/app/api/payment/order-status/route';
import { POST as syncPost } from '@/app/api/payment/sync/route';
import { findUserByEmail, saveExamResult } from '@/lib/db';

const origin = 'https://lolosin.com';

interface FakeRow {
  [key: string]: unknown;
}

interface FakeDb {
  sql: unknown;
  calls: string[];
}

/**
 * Table-keyed fake: each template-literal query is matched against the table
 * names it mentions, so a route's call ORDER never has to be known. Unmatched
 * queries return empty rows.
 */
function fakeDb(tables: Record<string, FakeRow[]>): FakeDb {
  const calls: string[] = [];
  const sql = (strings: TemplateStringsArray, ..._values: unknown[]) => {
    const text = strings.join('?');
    calls.push(text);
    for (const [table, rows] of Object.entries(tables)) {
      if (new RegExp(`\\b${table}\\b`, 'i').test(text)) return Promise.resolve(rows);
    }
    return Promise.resolve([]);
  };
  (sql as unknown as { query: (q: string) => Promise<FakeRow[]> }).query = (q: string) => {
    calls.push(q);
    return Promise.resolve([]);
  };
  return { sql, calls };
}

const dbHolder: FakeDb = { sql: null, calls: [] };

vi.mock('@/lib/db', () => ({
  getDb: () => dbHolder.sql,
  isDbConnected: vi.fn(async () => true),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
  saveExamResult: vi.fn(),
  getPackageLeaderboard: vi.fn(),
}));

vi.mock('@/lib/adminAuth', () => ({
  isAuthorizedAdmin: vi.fn(() => false),
}));

vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined }),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<FsModule>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => true),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
      readFileSync: vi.fn(() => '[]'),
    },
  };
});

import fs from 'fs';
import { isAuthorizedAdmin } from '@/lib/adminAuth';

function jsonReq(path: string, body: unknown): Request {
  return new Request(origin + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Order row as the webhook SELECT returns it. */
function orderRow(over: Partial<FakeRow> = {}): FakeRow {
  return {
    id: 5,
    user_id: 'u1',
    user_email: null,
    package_id: null,
    order_type: 'pro',
    exact_amount: 1001,
    status: 'pending',
    signature: 'real-sig',
    package_ids: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbHolder.sql = null;
  dbHolder.calls = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// A01:2025 Broken Access Control
// ─────────────────────────────────────────────────────────────────────────────
describe('A01 — payment webhook authenticity', () => {
  it('rejects a forged signature', async () => {
    dbHolder.sql = fakeDb({ payment_orders: [orderRow()] }).sql;

    const res = await webhookPost(
      jsonReq('/api/webhooks/klikqris', { order_id: 'INV-5', status: 'PAID', signature: 'attacker' }) as never
    );

    expect(res.status).toBe(403);
  });

  it('does not grant entitlement when the signature is absent', async () => {
    const db = fakeDb({ payment_orders: [orderRow()] });
    dbHolder.sql = db.sql;

    const res = await webhookPost(
      jsonReq('/api/webhooks/klikqris', { order_id: 'INV-5', status: 'PAID' }) as never
    );

    expect(res.status).toBe(403);
    expect(db.calls.some((c) => /UPDATE users/i.test(c))).toBe(false);
  });

  it('rejects a webhook for a legacy order with no stored signature (audit F1)', async () => {
    // Live DB: 2 paid orders (ids 3, 20) carried signature = NULL, and the old
    // `if (order.signature)` gate was skipped for those rows — any caller who
    // guessed the integer order id could flip status to paid and bank the
    // entitlement. The signature is now required unconditionally.
    const db = fakeDb({ payment_orders: [orderRow({ signature: null })] });
    dbHolder.sql = db.sql;

    const res = await webhookPost(
      jsonReq('/api/webhooks/klikqris', { order_id: 'INV-5', status: 'PAID' }) as never
    );

    expect(res.status).toBe(403);
    expect(db.calls.some((c) => /UPDATE users/i.test(c))).toBe(false);
  });

  it('rejects a webhook whose amount is below the order total (audit F1b)', async () => {
    const db = fakeDb({ payment_orders: [orderRow({ exact_amount: 5001, signature: 'real-sig' })] });
    dbHolder.sql = db.sql;

    const res = await webhookPost(
      jsonReq('/api/webhooks/klikqris', {
        order_id: 'INV-5',
        status: 'PAID',
        signature: 'real-sig',
        total_amount: 1,
      }) as never
    );

    expect(res.status).toBe(400);
    expect(db.calls.some((c) => /UPDATE users/i.test(c))).toBe(false);
  });
});

describe('A01 — exam result authority', () => {
  it('recomputes the score server-side instead of trusting the request body (audit F2)', async () => {
    // Live probe: POST /api/results with totalScore 550 returned
    // {"success":true} from an unauthenticated client, and the forged row took
    // rank #1. The handler now derives every score from `answers`.
    vi.mocked(saveExamResult).mockResolvedValue('r1');

    await resultsPost(
      jsonReq('/api/results', {
        packageId: 'tryout-1',
        totalScore: 550,
        scoreTwk: 150,
        scoreTiu: 175,
        scoreTkp: 225,
        isPassed: true,
        durationUsed: 1,
      }) as never
    );

    const arg = vi.mocked(saveExamResult).mock.calls[0]?.[0];
    expect(arg?.totalScore).toBeLessThan(550);
  });

  it('rejects an answer map naming questions outside the package (audit F2b)', async () => {
    vi.mocked(saveExamResult).mockResolvedValue('r1');

    const res = await resultsPost(
      jsonReq('/api/results', {
        packageId: 'tryout-1',
        answers: { '999999': 'A' },
        durationUsed: 1,
      }) as never
    );

    expect(res.status).toBe(400);
    expect(saveExamResult).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A05:2025 Injection / A02 Security Misconfiguration
// ─────────────────────────────────────────────────────────────────────────────
describe('A05 — admin file upload', () => {
  it('refuses to persist an attacker-chosen extension (audit F4)', async () => {
    // Guard is satisfied so the test exercises the extension handling itself.
    vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
    const form = new FormData();
    form.append('file', new File([Buffer.from('<script>alert(1)</script>')], 'x.html', { type: 'image/png' }));

    await uploadPost(
      new Request(origin + '/api/admin/upload', { method: 'POST', body: form }) as never
    );

    const written = vi.mocked(fs.writeFileSync).mock.calls.map((c) => String(c[0]));
    expect(written.filter((p) => p.endsWith('.html'))).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A07:2025 Authentication Failures
// ─────────────────────────────────────────────────────────────────────────────
describe('A07 — login does not enumerate accounts', () => {
  it('returns an identical body for unknown email and wrong password', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    const missing = await loginPost(
      jsonReq('/api/auth/login', { email: 'nobody@example.com', password: 'x' }) as never
    );

    vi.mocked(findUserByEmail).mockResolvedValue({
      id: 'u1',
      email: 'real@example.com',
      name: 'Real',
      password_hash: '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
    } as never);
    const wrongPass = await loginPost(
      jsonReq('/api/auth/login', { email: 'real@example.com', password: 'x' }) as never
    );

    expect(await missing.json()).toEqual(await wrongPass.json());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A05:2025 — path traversal on admin package ids
// ─────────────────────────────────────────────────────────────────────────────
describe('A05 — admin package id validation', () => {
  it('refuses a traversal packageId before it reaches the filesystem (audit F5)', async () => {
    vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
    dbHolder.sql = null;

    const res = await packagesPost(
      new Request(origin + '/api/admin/packages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ packageId: '../../etc/passwd', title: 'x', questions: [] }),
      }) as never
    );

    expect(res.status).toBe(400);
    const written = vi.mocked(fs.writeFileSync).mock.calls.map((c) => String(c[0]));
    expect(written.some((p) => p.includes('..'))).toBe(false);
  });

  it('accepts a well-formed packageId (audit F5 control)', async () => {
    vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
    dbHolder.sql = fakeDb({}).sql;

    const res = await packagesPost(
      new Request(origin + '/api/admin/packages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          packageId: 'tryout-baru-1',
          question: { category: 'TWK', subCategory: 'Umum', text: 'x', options: [], explanation: '' },
        }),
      }) as never
    );

    // The id is well-formed, so it must clear the id guard specifically.
    expect(res.status).not.toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A02:2025 — admin guard fails closed
// ─────────────────────────────────────────────────────────────────────────────
describe('A02 — admin guard has no default PIN', () => {
  it('denies access when ADMIN_PIN is unset (audit F7)', async () => {
    const { isAuthorizedAdmin: realGuard } = await vi.importActual<typeof import('@/lib/adminAuth')>(
      '@/lib/adminAuth'
    );
    const saved = process.env.ADMIN_PIN;
    delete process.env.ADMIN_PIN;
    try {
      const req = new Request(origin + '/api/admin/db-status', {
        headers: { 'x-admin-pin': '123456' },
      });
      expect(realGuard(req as never)).toBe(false);
    } finally {
      if (saved !== undefined) process.env.ADMIN_PIN = saved;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A01:2025 — payment read surface
// ─────────────────────────────────────────────────────────────────────────────
describe('A01 — payment order reads require ownership', () => {
  beforeEach(() => {
    // `next/headers` is mocked to return no cookie at the top of this file, so
    // every request below is the unauthenticated attacker's.
    dbHolder.sql = null;
    dbHolder.calls.length = 0;
  });

  it('refuses an unauthenticated order-status read (audit F4)', async () => {
    const res = await orderStatusGet(
      new Request(origin + '/api/payment/order-status?orderId=3') as never
    );
    expect(res.status).toBe(401);
  });

  it('refuses an unauthenticated payment sync (audit F4)', async () => {
    const res = await syncPost(
      new Request(origin + '/api/payment/sync', {
        method: 'POST',
        body: JSON.stringify({ orderId: 3 }),
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it('scopes the order lookup to the session user, not just the id (audit F4)', async () => {
    // With no cookie the route must not reach the database at all — the id is
    // never trusted to select the row.
    const db = fakeDb({ payment_orders: [{ id: 3, user_id: 'someone-else' }] });
    dbHolder.sql = db.sql;

    await orderStatusGet(
      new Request(origin + '/api/payment/order-status?orderId=3') as never
    );

    expect(db.calls.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A01:2025 — answer-key exposure
// ─────────────────────────────────────────────────────────────────────────────
describe('A01 — exam questions endpoint', () => {
  it('does not ship the answer key to an unauthenticated client (audit F3)', async () => {
    // Live: curl https://lolosin.com/api/questions/tryout-mini returned each
    // option's `score` (5 = correct), plus `correctAnswer`, `explanation` and
    // `tkpScores`, cached at the CDN via s-maxage=300. No cookie required.
    // The endpoint now emits only the public shape.
    const res = await questionsGet(new Request(origin + '/api/questions/tryout-mini') as never, {
      params: { id: 'tryout-mini' },
    } as never);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { questions?: FakeRow[] };
    expect(body.questions?.length).toBeGreaterThan(0);
    for (const q of body.questions ?? []) {
      expect(q.correctAnswer).toBeUndefined();
      expect(q.explanation).toBeUndefined();
      for (const o of (q.options ?? []) as FakeRow[]) expect(o.score).toBeUndefined();
    }
  });

  it('still serves the option text and ids the exam needs (audit F3 control)', async () => {
    const res = await questionsGet(new Request(origin + '/api/questions/tryout-mini') as never, {
      params: { id: 'tryout-mini' },
    } as never);

    const body = (await res.json()) as { questions?: FakeRow[] };
    const first = body.questions?.[0];
    expect(first?.id).toBeTypeOf('number');
    expect(first?.text).toBeTruthy();
    const opts = (first?.options ?? []) as FakeRow[];
    expect(opts.length).toBeGreaterThan(0);
    expect(opts[0]?.id).toBeTruthy();
    expect(opts[0]?.text).toBeTruthy();
  });
});
