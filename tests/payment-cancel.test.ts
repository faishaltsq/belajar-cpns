import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (name === 'cpns_token' ? { value: 'valid-token' } : null),
  }),
}));

const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({
  verifyToken: (...args: any[]) => mockVerifyToken(...args),
}));

import { POST } from '@/app/api/payment/cancel/route';

describe('POST /api/payment/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyToken.mockResolvedValue({ userId: 'user-1', email: 'u1@test.com' });
  });

  it('rejects unauthenticated request', async () => {
    mockVerifyToken.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderId: 10 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('cancels a pending order owned by the user', async () => {
    // 1. Find order
    mockSql.mockResolvedValueOnce([
      { id: 10, user_id: 'user-1', user_email: 'u1@test.com', status: 'pending' },
    ]);
    // 2. Update order
    mockSql.mockResolvedValueOnce([]);

    const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderId: 10 }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('refuses to cancel an order that is already paid', async () => {
    mockSql.mockResolvedValueOnce([
      { id: 10, user_id: 'user-1', user_email: 'u1@test.com', status: 'paid' },
    ]);

    const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderId: 10 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
