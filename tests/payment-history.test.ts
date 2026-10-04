import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (name === 'cpns_token' ? { value: 'mock-valid-token' } : null),
  }),
}));

const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({
  verifyToken: (...args: any[]) => mockVerifyToken(...args),
}));

import { GET } from '@/app/api/payment/history/route';

describe('GET /api/payment/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyToken.mockResolvedValue({ userId: 'user-uuid-123', email: 'test@example.com' });
  });

  it('returns 401 when token is invalid', async () => {
    mockVerifyToken.mockResolvedValueOnce(null);

    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns user active packages and transaction history', async () => {
    // 1. User profile query
    mockSql.mockResolvedValueOnce([
      {
        id: 'user-uuid-123',
        email: 'test@example.com',
        is_pro: true,
        pro_activated_at: '2026-10-01T00:00:00Z',
        unlocked_packages: ['tryout-1', 'tryout-2'],
      },
    ]);

    // 2. Packages list query (for labels)
    mockSql.mockResolvedValueOnce([
      { id: 'tryout-1', title: 'Paket Tryout SKD 01' },
      { id: 'tryout-2', title: 'Paket Tryout SKD 02' },
    ]);

    // 3. Transactions query from payment_orders
    mockSql.mockResolvedValueOnce([
      {
        id: 101,
        order_type: 'pro',
        package_id: null,
        base_amount: 1000,
        unique_code: 15,
        exact_amount: 1015,
        status: 'paid',
        created_at: '2026-10-02T10:00:00Z',
        expires_at: '2026-10-02T12:00:00Z',
        paid_at: '2026-10-02T10:05:00Z',
      },
      {
        id: 99,
        order_type: 'single',
        package_id: 'tryout-1',
        base_amount: 1000,
        unique_code: 88,
        exact_amount: 1088,
        status: 'pending',
        created_at: '2026-10-04T10:00:00Z',
        expires_at: '2030-10-04T12:00:00Z',
        paid_at: null,
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.isPro).toBe(true);
    expect(data.transactions).toHaveLength(2);
    expect(data.transactions[0].id).toBe(101);
    expect(data.transactions[0].status).toBe('paid');
    expect(data.transactions[1].status).toBe('pending');
  });
});
