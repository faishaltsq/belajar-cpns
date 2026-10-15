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

// ---------------------------------------------------------
// Task 3.5: three-tier bundle selection in the upgrade modal
// ---------------------------------------------------------
describe('bundle UI', () => {
  const readModal = async () => {
    const fs = await import('fs');
    const path = await import('path');
    return fs.readFileSync(
      path.join(process.cwd(), 'src/components/UpgradeProModal.tsx'), 'utf8');
  };

  it('offers three tiers with the real prices', async () => {
    const src = await readModal();
    expect(src).toMatch(/'bundle'/);
    expect(src).toMatch(/Rp 18\.000|18000/);
    expect(src).toMatch(/Rp 59\.000|59000/);
    expect(src).toMatch(/grid-cols-3/);
  });

  it('sends packageIds for the bundle tier', async () => {
    const src = await readModal();
    expect(src).toMatch(/packageIds/);
    // and never an amount — the server owns the price
    expect(src).not.toMatch(/baseAmount: plan/);
  });

  it('states the bundle saving from the numbers it actually charges', async () => {
    const src = await readModal();
    // 5 x 5000 = 25000 vs 18000 is 28%, not 20%
    expect(src).toMatch(/HEMAT 28%/);
    expect(src).not.toMatch(/HEMAT 20%/);
    expect(src).toMatch(/Rp 3\.600 per paket|3\.600 per paket/);
  });

  it('preselects a CAT-format bundle of exactly BUNDLE_SIZE packages', async () => {
    const src = await readModal();
    const m = src.match(/useState<string\[\]>\(\[(.*?)\]\)/);
    expect(m, 'default bundle literal not found').toBeTruthy();
    const ids = m![1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    // tryout-3..6 ship zero correct_answer rows, so they grade wrong
    expect(ids).not.toContain('tryout-4');
  });
});

// ---------------------------------------------------------
// Task 3.6: a bundle order must never be labelled PRO
// ---------------------------------------------------------
describe('bundle labelling', () => {
  const read = async (rel: string) => {
    const fs = await import('fs');
    const path = await import('path');
    return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
  };

  it('history route maps bundle to a readable title', async () => {
    const src = await read('src/app/api/payment/history/route.ts');
    expect(src).toMatch(/order_type === 'bundle'/);
    // and it must select the column it reads the title from
    expect(src).toMatch(/package_ids/);
  });

  it('abandoned reminder labels bundle orders', async () => {
    const src = await read('src/app/api/payment/abandoned-reminders/route.ts');
    expect(src).toMatch(/order_type === 'bundle'/);
  });

  it('riwayat page accepts the bundle order type', async () => {
    const src = await read('src/app/riwayat/page.tsx');
    expect(src).toMatch(/'bundle'/);
    // the label chain must not send a bundle straight to PRO wording
    expect(src).not.toMatch(/orderType === 'pro' \? 'Akses PRO'\s*:\s*'Paket Satuan'/);
  });
});
