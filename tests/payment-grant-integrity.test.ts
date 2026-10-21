import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Integrity of the two statements that decide what a learner owns: the
 * entitlement grant and the order status transitions the webhook performs.
 *
 * The Neon HTTP driver is mocked, so what is asserted is the shape of each
 * statement — a single self-contained UPDATE is the property that makes the
 * grant safe without a transaction, which is also what the merge rewrite in
 * `grantEntitlement` had to preserve.
 */

interface Recorded {
  sql: string;
  params: unknown[];
}

const calls: Recorded[] = [];

/**
 * Per-test DB state, read by the dispatcher below instead of a
 * `mockResolvedValueOnce` queue: queued values leak forward between tests when
 * a handler stops issuing a statement, which quietly feeds the next test's
 * first query with the previous test's leftover row.
 */
const db = {
  orderRow: null as Record<string, unknown> | null,
  expiryRows: [] as Record<string, unknown>[],
  userRows: [] as Record<string, unknown>[],
};

const mockSql = vi.fn(async (strings: TemplateStringsArray, ...params: unknown[]) => {
  const sql = strings.join('?');
  calls.push({ sql, params });
  if (/UPDATE\s+payment_orders/i.test(sql)) return db.expiryRows;
  if (/FROM\s+payment_orders/i.test(sql)) return db.orderRow ? [db.orderRow] : [];
  if (/SELECT\s+id\s+FROM\s+users/i.test(sql)) return db.userRows;
  return [];
});

vi.mock('@/lib/db', () => ({ getDb: () => mockSql }));

import { grantEntitlement, toEntitlementOrder } from '@/lib/grantEntitlement';
import { POST as klikQrisWebhookHandler } from '@/app/api/webhooks/klikqris/route';

beforeEach(() => {
  calls.length = 0;
  db.orderRow = null;
  db.expiryRows = [];
  db.userRows = [];
  mockSql.mockClear();
});

describe('toEntitlementOrder', () => {
  it('keeps only the fields the grant needs', () => {
    const order = toEntitlementOrder({
      id: '42',
      user_id: 'u1',
      user_email: 'a@b.c',
      package_id: 'tryout-3',
      order_type: 'single',
      package_ids: ['tryout-3'],
      status: 'paid',
      exact_amount: 5000,
    });
    expect(order).toEqual({
      id: 42,
      user_id: 'u1',
      user_email: 'a@b.c',
      package_id: 'tryout-3',
      order_type: 'single',
      package_ids: ['tryout-3'],
    });
  });

  it('refuses a row without a usable id', () => {
    expect(toEntitlementOrder({ id: 'INV-7', user_id: 'u1' })).toBeNull();
    expect(toEntitlementOrder({})).toBeNull();
  });

  it('treats an empty user_id as missing so the grant falls back to the email', () => {
    const order = toEntitlementOrder({ id: 1, user_id: '' });
    expect(order?.user_id).toBeNull();
    expect(order?.user_email).toBeNull();
  });
});

describe('grantEntitlement', () => {
  it('upgrades to PRO without reading anything first', async () => {
    await grantEntitlement(mockSql as never, toEntitlementOrder({ id: 1, user_id: 'u1', order_type: 'pro' })!);

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toMatch(/UPDATE\s+users/i);
    expect(calls[0].sql).toMatch(/is_pro\s*=\s*true/i);
    // A read-modify-write would need a SELECT of the current state first; a
    // standalone UPDATE is what makes two simultaneous grants safe.
    expect(calls.some((c) => /SELECT\s+unlocked_packages/i.test(c.sql))).toBe(false);
  });

  it('appends a single-package unlock with one UPDATE and no prior read', async () => {
    await grantEntitlement(
      mockSql as never,
      toEntitlementOrder({ id: 1, user_id: 'u1', order_type: 'single', package_id: 'tryout-3' })!
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toMatch(/UPDATE\s+users/i);
    expect(calls[0].sql).toMatch(/unlocked_packages/i);
    expect(calls[0].params.some((p) => String(p).includes('"tryout-3"'))).toBe(true);
    expect(calls.some((c) => /SELECT\s+unlocked_packages/i.test(c.sql))).toBe(false);
  });

  it('passes a bundle package_ids array to the same statement', async () => {
    await grantEntitlement(
      mockSql as never,
      toEntitlementOrder({
        id: 1,
        user_id: 'u1',
        order_type: 'bundle',
        package_ids: ['tryout-3', 'tryout-4'],
      })!
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].params.some((p) => typeof p === 'string' && p.includes('tryout-3') && p.includes('tryout-4'))).toBe(
      true
    );
  });

  it('does nothing when a bundle carries no package ids', async () => {
    await grantEntitlement(
      mockSql as never,
      toEntitlementOrder({ id: 1, user_id: 'u1', order_type: 'bundle', package_ids: [] })!
    );
    expect(calls).toHaveLength(0);
  });

  it('does nothing when a single order names no package', async () => {
    await grantEntitlement(
      mockSql as never,
      toEntitlementOrder({ id: 1, user_id: 'u1', order_type: 'single', package_id: null })!
    );
    expect(calls).toHaveLength(0);
  });

  it('resolves the account by email when the order has no user_id', async () => {
    db.userRows = [{ id: 'user-from-email' }];
    await grantEntitlement(
      mockSql as never,
      toEntitlementOrder({ id: 1, user_email: '  learner@Example.com ', order_type: 'pro' })!
    );

    const lookup = calls.find((c) => /SELECT\s+id\s+FROM\s+users/i.test(c.sql));
    expect(lookup?.params).toContain('learner@example.com');
    expect(calls.some((c) => /UPDATE\s+users/i.test(c.sql) && c.params.includes('user-from-email'))).toBe(true);
  });

  it('grants nothing when the order email matches no account', async () => {
    db.userRows = [];
    await grantEntitlement(
      mockSql as never,
      toEntitlementOrder({ id: 1, user_email: 'ghost@example.com', order_type: 'pro' })!
    );
    expect(calls.filter((c) => /UPDATE\s+users/i.test(c.sql))).toHaveLength(0);
  });

  it('grants nothing for an unknown order type — never a PRO fallthrough', async () => {
    await grantEntitlement(
      mockSql as never,
      toEntitlementOrder({ id: 1, user_id: 'u1', order_type: 'vip', package_id: 'tryout-3' })!
    );
    expect(calls.filter((c) => /UPDATE\s+users/i.test(c.sql))).toHaveLength(0);
  });

  it('grants nothing for an order with neither user_id nor email', async () => {
    await grantEntitlement(
      mockSql as never,
      toEntitlementOrder({ id: 1, user_id: null, user_email: null, order_type: 'pro' })!
    );
    expect(calls).toHaveLength(0);
  });
});

describe('webhook order transitions', () => {
  const SIG = 'sig-7001';
  const paidOrder = { id: 7001, user_id: 'u1', status: 'paid', signature: SIG, order_type: 'single', package_id: 'tryout-3' };
  const pendingOrder = { ...paidOrder, status: 'pending' };
  const expiryUpdates = () => calls.filter((c) => /UPDATE\s+payment_orders/i.test(c.sql));

  function request(payload: Record<string, unknown>) {
    return new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  it('marks a pending order expired, guarded on the status it read', async () => {
    db.orderRow = pendingOrder;
    db.expiryRows = [{ id: 7001 }];

    const res = await klikQrisWebhookHandler(request({ order_id: 'INV-7001', status: 'EXPIRED', signature: SIG }));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe('Order marked expired');

    const stmt = expiryUpdates()[0];
    expect(stmt?.sql).toMatch(/status\s*=\s*'pending'/);
  });

  it('never touches an order that is already paid', async () => {
    // Idempotency short-circuits before any status write. Without that, a late
    // EXPIRED delivery flips a paid order back to 'expired', which re-opens
    // the idempotency check for the next PAID delivery and re-grants access.
    db.orderRow = paidOrder;

    const res = await klikQrisWebhookHandler(request({ order_id: 'INV-7001', status: 'EXPIRED', signature: SIG }));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe('Already processed');
    expect(expiryUpdates()).toHaveLength(0);
  });

  it('treats a guarded expiry that matched no row as already processed', async () => {
    // Two deliveries racing: the row was still 'pending' when read, but another
    // request already flipped it before this UPDATE ran.
    db.orderRow = pendingOrder;
    db.expiryRows = [];

    const res = await klikQrisWebhookHandler(request({ order_id: 'INV-7001', status: 'EXPIRED', signature: SIG }));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe('Already processed');
    expect(expiryUpdates()).toHaveLength(1);
    // Nothing is granted on the losing side of the race.
    expect(calls.some((c) => /unlocked_packages/i.test(c.sql))).toBe(false);
  });

  it('re-grants nothing when a PAID webhook arrives after the order is already paid', async () => {
    db.orderRow = paidOrder;

    const res = await klikQrisWebhookHandler(
      request({ order_id: 'INV-7001', status: 'PAID', signature: SIG, total_amount: 5000 })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe('Already processed');
    expect(calls.some((c) => /UPDATE\s+payment_orders/i.test(c.sql))).toBe(false);
    expect(calls.some((c) => /unlocked_packages/i.test(c.sql) || /is_pro/i.test(c.sql))).toBe(false);
  });

  it('grants access exactly once for the request that flips the order to paid', async () => {
    db.orderRow = pendingOrder;
    db.expiryRows = [{ id: 7001 }];

    const res = await klikQrisWebhookHandler(
      request({ order_id: 'INV-7001', status: 'PAID', signature: SIG, total_amount: 5000 })
    );
    expect(res.status).toBe(200);
    expect(calls.filter((c) => /unlocked_packages/i.test(c.sql))).toHaveLength(1);
  });
});
