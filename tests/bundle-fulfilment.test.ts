// tests/bundle-fulfilment.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => mockSql }));
const mockCookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({ cookies: () => mockCookieStore }));
const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({ verifyToken: (...a: any[]) => mockVerifyToken(...a) }));
const mockCheckKlikQris = vi.fn();
vi.mock('@/lib/klikqris', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/klikqris')>();
  return { ...actual, checkKlikQrisStatus: (...a: any[]) => mockCheckKlikQris(...a) };
});

import { POST as webhook } from '@/app/api/webhooks/klikqris/route';
import { POST as sync } from '@/app/api/payment/sync/route';

const BUNDLE = ['tryout-4', 'tryout-5', 'tryout-6', 'tryout-7', 'tryout-8'];

/** Extracts every UPDATE issued, so we can assert is_pro was never set true. */
function sqlText(): string {
  return mockSql.mock.calls
    .map((c) => (Array.isArray(c[0]) ? c[0].join('?') : String(c[0])))
    .join('\n');
}

beforeEach(() => {
  vi.resetAllMocks();
  mockCookieStore.get.mockReturnValue({ value: 'tok' });
  mockVerifyToken.mockResolvedValue({ userId: 'u-1', email: 'a@b.c' });
});

describe('bundle fulfilment — webhook path', () => {
  it('appends all bundle packages and does not set is_pro', async () => {
    mockSql
      .mockResolvedValueOnce([{ id: 1, user_id: 'u-1', user_email: null, package_id: 'bundle',
        order_type: 'bundle', exact_amount: 18000, status: 'pending', signature: 'sig-bundle-1',
        package_ids: BUNDLE }])                                  // order SELECT
      .mockResolvedValueOnce([{ id: 1 }])                        // UPDATE payment_orders (atomic)
      .mockResolvedValueOnce([{ unlocked_packages: [] }])        // SELECT users
      .mockResolvedValueOnce([]);                                // UPDATE users

    const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
      method: 'POST',
      body: JSON.stringify({ order_id: 'INV-1', status: 'PAID', total_amount: 18000, signature: 'sig-bundle-1' }),
    });
    const res = await webhook(req);
    expect(res.status).toBe(200);

    expect(sqlText()).toContain('unlocked_packages');
    expect(sqlText()).not.toMatch(/is_pro\s*=\s*(true|TRUE)/i);
  });
});

describe('bundle fulfilment — manual sync path', () => {
  it('appends bundle packages instead of falling through to is_pro', async () => {
    mockSql
      .mockResolvedValueOnce([{ id: 1, user_id: 'u-1', user_email: null, package_id: 'bundle',
        order_type: 'bundle', base_amount: 18000, exact_amount: 18000, status: 'pending',
        package_ids: BUNDLE }])                                  // order SELECT
      .mockResolvedValueOnce([{ id: 1 }])                        // UPDATE payment_orders (atomic)
      .mockResolvedValueOnce([{ id: 'u-1', email: 'a@b.c', is_pro: false, unlocked_packages: [] }])
      .mockResolvedValueOnce([]);                                // UPDATE users
    mockCheckKlikQris.mockResolvedValue({ success: true, status: 'PAID' });

    const req = new NextRequest('http://localhost:3000/api/payment/sync', {
      method: 'POST', body: JSON.stringify({ orderId: 1 }),
    });
    const res = await sync(req);
    expect(res.status).toBe(200);

    expect(sqlText()).toContain('unlocked_packages');
    expect(sqlText()).not.toMatch(/is_pro\s*=\s*(TRUE|true)/i);
  });

  it('still grants PRO for an order_type of pro', async () => {
    mockSql
      .mockResolvedValueOnce([{ id: 2, user_id: 'u-1', user_email: null, package_id: null,
        order_type: 'pro', base_amount: 59000, exact_amount: 59000, status: 'pending' }])
      .mockResolvedValueOnce([{ id: 2 }])                        // UPDATE payment_orders (atomic)
      .mockResolvedValueOnce([{ id: 'u-1', email: 'a@b.c', is_pro: false, unlocked_packages: [] }])
      .mockResolvedValueOnce([]);
    mockCheckKlikQris.mockResolvedValue({ success: true, status: 'PAID' });

    const req = new NextRequest('http://localhost:3000/api/payment/sync', {
      method: 'POST', body: JSON.stringify({ orderId: 2 }),
    });
    await sync(req);
    expect(sqlText()).toMatch(/is_pro\s*=\s*TRUE/i);
  });
});
