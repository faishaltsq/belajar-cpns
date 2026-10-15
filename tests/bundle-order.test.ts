import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => mockSql }));
const mockCookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({ cookies: () => mockCookieStore }));
const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({ verifyToken: (...a: any[]) => mockVerifyToken(...a) }));
const mockCreateKlikQris = vi.fn();
vi.mock('@/lib/klikqris', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/klikqris')>();
  return { ...actual, createKlikQrisTransaction: (...a: any[]) => mockCreateKlikQris(...a) };
});

import { POST as createOrder } from '@/app/api/payment/create-order/route';

const req = (body: object) =>
  new NextRequest('http://localhost:3000/api/payment/create-order', {
    method: 'POST', body: JSON.stringify(body),
  });

const VALID = ['tryout-4', 'tryout-5', 'tryout-6', 'tryout-7', 'tryout-8'];

beforeEach(() => {
  vi.resetAllMocks();
  mockCookieStore.get.mockReturnValue({ value: 'tok' });
  mockVerifyToken.mockResolvedValue({ userId: 'u-1', email: 'a@b.c' });
});

describe('bundle order creation', () => {
  it('prices a bundle at the bundle table price', async () => {
    mockSql
      .mockResolvedValueOnce([{ is_pro: false, unlocked_packages: [] }]) // guard
      .mockResolvedValueOnce([])                                        // existing pending
      .mockResolvedValueOnce([{ id: 700 }])                             // INSERT
      .mockResolvedValueOnce([]);                                       // UPDATE
    mockCreateKlikQris.mockResolvedValueOnce({
      success: true, orderId: 'INV-700', uniqueCode: 9,
      totalAmount: 18009, qrisUrl: 'https://x/q.png',
      qrisImage: 'data:image/png;base64,q', signature: 's',
    });

    const res = await createOrder(req({ orderType: 'bundle', packageIds: VALID }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.baseAmount).toBe(18000);
    expect(json.orderType).toBe('bundle');
    expect(json.packageIds).toEqual(VALID);
    expect(mockCreateKlikQris).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 18000 })
    );
  });

  it('stores the selected packages and a resolvable package_id on the order', async () => {
    mockSql
      .mockResolvedValueOnce([{ is_pro: false, unlocked_packages: [] }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 701 }])
      .mockResolvedValueOnce([]);
    mockCreateKlikQris.mockResolvedValueOnce({
      success: true, orderId: 'INV-701', uniqueCode: 1, totalAmount: 18001,
      qrisUrl: 'u', qrisImage: 'i', signature: 's',
    });

    await createOrder(req({ orderType: 'bundle', packageIds: VALID }));

    const insertParams = mockSql.mock.calls[2].slice(1).flat();
    // package_id must be the 'bundle' sentinel, not NULL, or the pending-order
    // dedupe query (which matches package_id = 'bundle') never finds its own row
    expect(insertParams).toContain('bundle');
    expect(insertParams).toContain(JSON.stringify(VALID));
  });

  it('rejects a bundle with the wrong number of packages', async () => {
    const res = await createOrder(req({ orderType: 'bundle', packageIds: ['tryout-4'] }));
    expect(res.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('rejects a bundle containing a package the user already owns', async () => {
    mockSql.mockResolvedValueOnce([{ is_pro: false, unlocked_packages: ['tryout-5'] }]);
    const res = await createOrder(req({ orderType: 'bundle', packageIds: VALID }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('ALREADY_UNLOCKED');
  });

  it('rejects a bundle containing a free package', async () => {
    const res = await createOrder(
      req({ orderType: 'bundle', packageIds: ['tryout-mini', 'tryout-4', 'tryout-5', 'tryout-6', 'tryout-7'] })
    );
    expect(res.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('rejects a bundle for a user who is already PRO', async () => {
    mockSql.mockResolvedValueOnce([{ is_pro: true, unlocked_packages: [] }]);
    const res = await createOrder(req({ orderType: 'bundle', packageIds: VALID }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('ALREADY_PRO');
  });

  it('rejects a bundle with no packageIds at all', async () => {
    const res = await createOrder(req({ orderType: 'bundle' }));
    expect(res.status).toBe(400);
  });
});
