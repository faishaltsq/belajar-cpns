// tests/entitlement-lifetime.test.ts
//
// The audit's open item was phrased "entitlement expiry after purchase", and
// the answer turned out to be the opposite of an expiry feature: the product
// sells permanent access ("Akses aktif selamanya sampai kamu lulus CPNS",
// UpgradeProModal). So what needs proving is that access, once granted, is not
// taken away by anything that happens to the *order* afterwards — the order is
// a payment record, not the entitlement itself.
//
// Three ways a paid order can still move, all covered here:
//   1. EXPIRED replayed after PAID      -> access stays (P1-7)
//   2. cancel racing a PAID delivery    -> the atomic guard decides, one winner
//   3. sync polling after a webhook     -> access granted exactly once
//
// Plus the grant semantics themselves: an unlock is additive (a later purchase
// never drops an earlier one) and idempotent (a duplicate delivery is a no-op).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

interface Recorded {
  sql: string;
  params: unknown[];
}

const calls: Recorded[] = [];

const db = {
  orderRow: null as Record<string, unknown> | null,
  updateRows: [] as Record<string, unknown>[],
  userRows: [] as Record<string, unknown>[],
};

const mockSql = vi.fn(async (strings: TemplateStringsArray, ...params: unknown[]) => {
  const sql = strings.join('?');
  calls.push({ sql, params });
  if (/UPDATE\s+payment_orders/i.test(sql)) return db.updateRows;
  if (/FROM\s+payment_orders/i.test(sql)) return db.orderRow ? [db.orderRow] : [];
  if (/SELECT\s+id\s+FROM\s+users/i.test(sql)) return db.userRows;
  return [];
});

vi.mock('@/lib/db', () => ({ getDb: () => mockSql }));

const mockCookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({ cookies: () => mockCookieStore }));
vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(async () => ({ userId: 'u-owner', email: 'owner@example.test' })),
}));
vi.mock('@/lib/klikqris', () => ({ checkKlikQrisStatus: vi.fn() }));

import { grantEntitlement, toEntitlementOrder } from '@/lib/grantEntitlement';
import { POST as webhook } from '@/app/api/webhooks/klikqris/route';
import { POST as cancelOrder } from '@/app/api/payment/cancel/route';
import { POST as syncOrder } from '@/app/api/payment/sync/route';
import { checkKlikQrisStatus } from '@/lib/klikqris';

const SIG = 'sig-lifetime';
const PAID_PACKAGE = 'tryout-3';

function paidOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 9101,
    user_id: 'u-owner',
    user_email: 'owner@example.test',
    package_id: PAID_PACKAGE,
    order_type: 'single',
    exact_amount: 5000,
    status: 'paid',
    signature: SIG,
    package_ids: null,
    ...overrides,
  };
}

function webhookReq(payload: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function cancelReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/payment/cancel', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function syncReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/payment/sync', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const grantStatements = () => calls.filter((c) => /UPDATE\s+users/i.test(c.sql));

beforeEach(() => {
  calls.length = 0;
  db.orderRow = null;
  db.updateRows = [];
  db.userRows = [];
  mockSql.mockClear();
  mockCookieStore.get.mockReturnValue({ name: 'cpns_token', value: 'valid' });
  vi.mocked(checkKlikQrisStatus).mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. The order moves; the entitlement does not
// ─────────────────────────────────────────────────────────────────────────────

describe('access survives every later transition of a paid order', () => {
  it('keeps the unlock when EXPIRED is replayed after PAID', async () => {
    // The dangerous shape: a late or replayed EXPIRED delivery. Access must
    // stay granted — the learner paid — while the history is left alone.
    db.orderRow = paidOrder();

    const res = await webhook(webhookReq({ order_id: 'INV-9101', status: 'EXPIRED', signature: SIG }));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe('Already processed');
    expect(calls.some((c) => /UPDATE\s+payment_orders/i.test(c.sql))).toBe(false);
    expect(grantStatements()).toHaveLength(0);
  });

  it('grants nothing extra when PAID is delivered a second time', async () => {
    db.orderRow = paidOrder();

    const res = await webhook(webhookReq({ order_id: 'INV-9101', status: 'PAID', signature: SIG, total_amount: 5000 }));
    expect(res.status).toBe(200);
    expect(grantStatements()).toHaveLength(0);
  });

  it('leaves a paid order uncancellable, so the unlock cannot be revoked from the client', async () => {
    db.orderRow = paidOrder();

    const res = await cancelOrder(cancelReq({ orderId: 9101 }));
    expect(res.status).toBe(400);
    expect(calls.some((c) => /UPDATE\s+payment_orders/i.test(c.sql))).toBe(false);
  });

  it('answers a PAID order from the sync poller without re-granting', async () => {
    db.orderRow = paidOrder();

    const res = await syncOrder(syncReq({ orderId: 9101 }));
    expect(res.status).toBe(200);
    expect((await res.json()).paid).toBe(true);
    // Already paid in the database: no gateway call, no grant.
    expect(checkKlikQrisStatus).not.toHaveBeenCalled();
    expect(grantStatements()).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cancel vs a settling payment — one atomic winner
// ─────────────────────────────────────────────────────────────────────────────

describe('cancel racing a PAID delivery', () => {
  it('writes the cancel with a status guard so it cannot overwrite a paid row', async () => {
    // Read says 'pending'; by the time the UPDATE runs another delivery may
    // have settled it. The guard is what makes the outcome deterministic.
    db.orderRow = paidOrder({ status: 'pending' });
    db.updateRows = [{ id: 9101 }];

    const res = await cancelOrder(cancelReq({ orderId: 9101 }));
    expect(res.status).toBe(200);

    const stmt = calls.find((c) => /UPDATE\s+payment_orders/i.test(c.sql));
    expect(stmt?.sql).toMatch(/status\s*=\s*'cancelled'/);
    expect(stmt?.sql).toMatch(/AND\s+status\s*=\s*'pending'/);
  });

  it('reports a conflict instead of a false success when the guard matches nothing', async () => {
    // The payment settled between the read and the write: the cancel lost.
    // Saying "berhasil dibatalkan" here would tell the learner their payment
    // was cancelled when it was in fact taken.
    db.orderRow = paidOrder({ status: 'pending' });
    db.updateRows = [];

    const res = await cancelOrder(cancelReq({ orderId: 9101 }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain('tidak dapat dibatalkan');
  });

  it('refuses to cancel someone else’s order', async () => {
    db.orderRow = paidOrder({ status: 'pending', user_id: 'u-other', user_email: 'other@example.test' });

    const res = await cancelOrder(cancelReq({ orderId: 9101 }));
    expect(res.status).toBe(403);
    expect(calls.some((c) => /UPDATE\s+payment_orders/i.test(c.sql))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Exactly-once grant across both payment paths
// ─────────────────────────────────────────────────────────────────────────────

describe('exactly-once granting', () => {
  it('grants when the webhook wins the pending->paid transition', async () => {
    db.orderRow = paidOrder({ status: 'pending' });
    db.updateRows = [{ id: 9101 }];

    const res = await webhook(webhookReq({ order_id: 'INV-9101', status: 'PAID', signature: SIG, total_amount: 5000 }));
    expect(res.status).toBe(200);
    expect(grantStatements()).toHaveLength(1);
  });

  it('grants nothing when the transition matched no row (another delivery won)', async () => {
    db.orderRow = paidOrder({ status: 'pending' });
    db.updateRows = [];

    const res = await webhook(webhookReq({ order_id: 'INV-9101', status: 'PAID', signature: SIG, total_amount: 5000 }));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe('Already processed');
    expect(grantStatements()).toHaveLength(0);
  });

  it('grants through the sync path only when it owns the transition', async () => {
    db.orderRow = paidOrder({ status: 'pending' });
    vi.mocked(checkKlikQrisStatus).mockResolvedValue({ success: true, status: 'PAID' } as never);
    db.updateRows = [{ id: 9101 }];

    const res = await syncOrder(syncReq({ orderId: 9101 }));
    expect((await res.json()).paid).toBe(true);
    expect(grantStatements()).toHaveLength(1);
  });

  it('does not grant through the sync path when the webhook already settled it', async () => {
    db.orderRow = paidOrder({ status: 'pending' });
    vi.mocked(checkKlikQrisStatus).mockResolvedValue({ success: true, status: 'PAID' } as never);
    db.updateRows = [];

    const res = await syncOrder(syncReq({ orderId: 9101 }));
    // The poller still reports paid — the money is real — but access was
    // granted by whoever won the transition, so this call must not repeat it.
    expect((await res.json()).paid).toBe(true);
    expect(grantStatements()).toHaveLength(0);
  });

  it('never grants PRO for an unknown order type on either path', async () => {
    db.orderRow = paidOrder({ status: 'pending', order_type: 'vip' });
    db.updateRows = [{ id: 9101 }];

    const res = await webhook(webhookReq({ order_id: 'INV-9101', status: 'PAID', signature: SIG, total_amount: 5000 }));
    expect(res.status).toBe(200);
    expect(calls.some((c) => /is_pro\s*=\s*true/i.test(c.sql))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Additive, idempotent unlocks
// ─────────────────────────────────────────────────────────────────────────────

describe('unlock semantics', () => {
  it('appends a second purchase without dropping the first', async () => {
    // One statement, no read-modify-write: the concat is what keeps a second
    // purchase from overwriting the earlier unlock.
    await grantEntitlement(
      mockSql as never,
      toEntitlementOrder({ id: 1, user_id: 'u1', order_type: 'single', package_id: 'tryout-4' })!
    );

    expect(grantStatements()).toHaveLength(1);
    const stmt = grantStatements()[0].sql;
    expect(stmt).toMatch(/COALESCE\(unlocked_packages/i);
    // `? missing` (jsonb key-exists) is the dedupe: already-owned ids are not
    // appended a second time.
    expect(stmt).toMatch(/\?\s*missing/);
  });

  it('is a no-op statement for an already-owned package rather than a duplicate', async () => {
    await grantEntitlement(
      mockSql as never,
      toEntitlementOrder({ id: 1, user_id: 'u1', order_type: 'single', package_id: PAID_PACKAGE })!
    );

    // The dedupe lives in the WHERE NOT ... ? missing clause, so a re-grant
    // appends an empty array instead of a duplicate id.
    expect(grantStatements()[0].sql).toMatch(/WHERE\s+NOT\s+COALESCE/i);
  });

  it('does not downgrade a PRO account when a single package is granted', async () => {
    await grantEntitlement(
      mockSql as never,
      toEntitlementOrder({ id: 1, user_id: 'u1', order_type: 'single', package_id: PAID_PACKAGE })!
    );

    expect(grantStatements()[0].sql).not.toMatch(/is_pro/i);
  });
});
