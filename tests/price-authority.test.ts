import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------
// Mocks Setup
// ---------------------------------------------------------
const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => mockSql }));

const mockCookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({ cookies: () => mockCookieStore }));

const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({ verifyToken: (...args: any[]) => mockVerifyToken(...args) }));

const mockCreateKlikQris = vi.fn();
vi.mock('@/lib/klikqris', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/klikqris')>();
  return {
    ...actual,
    createKlikQrisTransaction: (...args: any[]) => mockCreateKlikQris(...args),
  };
});

import { POST as createOrder } from '@/app/api/payment/create-order/route';

function makeRequest(body: object) {
  return new NextRequest('http://localhost:3000/api/payment/create-order', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const okGateway = (amount: number) => ({
  success: true,
  orderId: 'INV-901',
  uniqueCode: 7,
  totalAmount: amount + 7,
  qrisUrl: 'https://example.invalid/q.png',
  qrisImage: 'data:image/png;base64,QQ==',
  signature: 'sig',
});

/** Concatenates every SQL query passed to the mocked tagged-template handler. */
function sqlText(): string {
  return mockSql.mock.calls
    .map((c) => (Array.isArray(c[0]) ? c[0].join('?') : String(c[0])))
    .join('\n');
}

beforeEach(() => {
  vi.resetAllMocks();
  mockCookieStore.get.mockReturnValue(undefined);
  mockVerifyToken.mockResolvedValue(null);
  // INSERT ... RETURNING id, then the post-gateway UPDATE
  mockSql.mockResolvedValue([{ id: 901 }]);
});

// ---------------------------------------------------------
// Price authority: the server owns the amount
// ---------------------------------------------------------
describe('create-order price authority', () => {
  it('ignores a client-supplied baseAmount and uses the PRO table price', async () => {
    mockCreateKlikQris.mockResolvedValueOnce(okGateway(59000));

    const res = await createOrder(makeRequest({ orderType: 'pro', baseAmount: 1 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.baseAmount).toBe(59000);
    expect(json.exactAmount).toBe(59007);
  });

  it('hands the table price to the gateway, not the client amount', async () => {
    mockCreateKlikQris.mockResolvedValueOnce(okGateway(59000));

    await createOrder(makeRequest({ orderType: 'pro', baseAmount: 1 }));

    expect(mockCreateKlikQris).toHaveBeenCalledTimes(1);
    expect(mockCreateKlikQris.mock.calls[0][0]).toMatchObject({
      amount: 59000,
      orderId: 'INV-901',
    });
  });

  it('stores the table price in the payment_orders row', async () => {
    mockCreateKlikQris.mockResolvedValueOnce(okGateway(59000));

    await createOrder(makeRequest({ orderType: 'pro', baseAmount: 1 }));

    // The INSERT parameters carry 59000, never the posted 1
    const insertParams = mockSql.mock.calls[0].slice(1).flat();
    expect(insertParams).toContain(59000);
    expect(insertParams).not.toContain(1);
  });

  it('prices a single order from the table when baseAmount is posted', async () => {
    mockCreateKlikQris.mockResolvedValueOnce(okGateway(5000));

    const res = await createOrder(
      makeRequest({ orderType: 'single', packageId: 'tryout-9', baseAmount: 100 })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.baseAmount).toBe(5000);
  });

  it('rejects an unknown orderType with 400 instead of coercing it to pro', async () => {
    const res = await createOrder(makeRequest({ orderType: 'free' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('INVALID_ORDERTYPE');
    // rejected before any DB work happens
    expect(mockSql).not.toHaveBeenCalled();
    expect(mockCreateKlikQris).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 42, '', 'PRO', 'Pro', 'admin'])(
    'rejects orderType %p as invalid',
    async (orderType) => {
      const res = await createOrder(makeRequest({ orderType }));
      expect(res.status).toBe(400);
    }
  );

  it('still accepts the three known order types', async () => {
    for (const orderType of ['single', 'bundle', 'pro']) {
      vi.clearAllMocks();
      mockCookieStore.get.mockReturnValue(undefined);
      mockVerifyToken.mockResolvedValue(null);
      mockSql.mockResolvedValue([{ id: 901 }]);
      mockCreateKlikQris.mockResolvedValueOnce(okGateway(59000));

      const res = await createOrder(
        makeRequest(orderType === 'single' ? { orderType, packageId: 'tryout-9' } : { orderType })
      );
      expect(res.status, `orderType=${orderType}`).toBe(200);
    }
  });
});

// ---------------------------------------------------------
// Guard behaviour that the restructure must not regress
// ---------------------------------------------------------
describe('create-order ownership guard', () => {
  it('rejects a single order for a package the user already owns', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'tok' });
    mockVerifyToken.mockResolvedValue({ userId: 'u-1', email: 'a@b.c' });
    mockSql.mockResolvedValueOnce([{ is_pro: false, unlocked_packages: ['tryout-9'] }]);

    const res = await createOrder(
      makeRequest({ orderType: 'single', packageId: 'tryout-9' })
    );
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe('ALREADY_UNLOCKED');
    expect(mockCreateKlikQris).not.toHaveBeenCalled();
  });

  it('rejects any purchase from a user who is already PRO', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'tok' });
    mockVerifyToken.mockResolvedValue({ userId: 'u-1', email: 'a@b.c' });
    mockSql.mockResolvedValueOnce([{ is_pro: true, unlocked_packages: [] }]);

    const res = await createOrder(makeRequest({ orderType: 'single', packageId: 'tryout-9' }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe('ALREADY_PRO');
  });

  it('does not send a price field anywhere in the stored row', async () => {
    mockCreateKlikQris.mockResolvedValueOnce(okGateway(59000));

    await createOrder(makeRequest({ orderType: 'pro', baseAmount: 1 }));

    const insertQuery = sqlText();
    expect(insertQuery).toContain('base_amount');
    // exact_amount is derived from the gateway, not the client
    expect(mockCreateKlikQris.mock.calls[0][0]).not.toHaveProperty('baseAmount');
  });
});
