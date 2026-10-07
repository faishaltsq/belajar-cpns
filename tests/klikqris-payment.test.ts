import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
}));

import { POST as klikQrisWebhook } from '@/app/api/webhooks/klikqris/route';

describe('POST /api/webhooks/klikqris', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects payload missing order_id with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
      method: 'POST',
      body: JSON.stringify({ status: 'PAID' }),
    });
    const res = await klikQrisWebhook(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when order does not exist in database', async () => {
    // 1. SELECT payment_orders returns empty
    mockSql.mockResolvedValueOnce([]);

    const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
      method: 'POST',
      body: JSON.stringify({ order_id: 'INV-999', status: 'PAID', total_amount: 50012 }),
    });
    const res = await klikQrisWebhook(req);
    expect(res.status).toBe(404);
  });

  it('handles idempotency gracefully if order is already paid', async () => {
    // 1. SELECT payment_orders returns already paid
    mockSql.mockResolvedValueOnce([
      {
        id: 101,
        user_id: 'usr-1',
        user_email: 'user@test.com',
        package_id: null,
        order_type: 'pro',
        exact_amount: 50012,
        status: 'paid',
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
      method: 'POST',
      body: JSON.stringify({ order_id: 'INV-101', status: 'PAID' }),
    });
    const res = await klikQrisWebhook(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain('Already processed');
    // Ensure no redundant UPDATE was called
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('upgrades user to PRO when PRO order is PAID (flat body format)', async () => {
    // 1. SELECT payment_orders
    mockSql.mockResolvedValueOnce([
      {
        id: 102,
        user_id: 'usr-123',
        user_email: 'user@test.com',
        package_id: null,
        order_type: 'pro',
        exact_amount: 50012,
        status: 'pending',
      },
    ]);
    // 2. UPDATE payment_orders to paid
    mockSql.mockResolvedValueOnce([]);
    // 3. UPDATE users is_pro = true
    mockSql.mockResolvedValueOnce([]);

    const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
      method: 'POST',
      body: JSON.stringify({
        order_id: 'INV-102',
        status: 'PAID',
        total_amount: 50012,
        signature: 'sig-abc',
      }),
    });
    const res = await klikQrisWebhook(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.orderId).toBe(102);
  });

  it('unlocks single package when single order is PAID (nested data body format)', async () => {
    // 1. SELECT payment_orders
    mockSql.mockResolvedValueOnce([
      {
        id: 103,
        user_id: 'usr-123',
        user_email: 'user@test.com',
        package_id: 'hots-2',
        order_type: 'single',
        exact_amount: 15012,
        status: 'pending',
      },
    ]);
    // 2. UPDATE payment_orders to paid
    mockSql.mockResolvedValueOnce([]);
    // 3. SELECT users unlocked_packages
    mockSql.mockResolvedValueOnce([
      { unlocked_packages: ['starter-1'] },
    ]);
    // 4. UPDATE users unlocked_packages
    mockSql.mockResolvedValueOnce([]);

    const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
      method: 'POST',
      body: JSON.stringify({
        status: 'success',
        message: 'Payment received',
        data: {
          order_id: 'INV-103',
          amount_paid: 15012,
          status: 'PAID',
          merchant_id: 'merchant-1',
          signature: 'sig-nested',
        },
      }),
    });
    const res = await klikQrisWebhook(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('rejects webhook with mismatched signature (403)', async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 104,
        user_id: 'usr-1',
        user_email: 'user@test.com',
        package_id: null,
        order_type: 'pro',
        exact_amount: 50012,
        status: 'pending',
        signature: 'correct-sig-from-create-order',
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
      method: 'POST',
      body: JSON.stringify({
        order_id: 'INV-104',
        status: 'PAID',
        signature: 'wrong-sig-tampered',
      }),
    });
    const res = await klikQrisWebhook(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('signature');
  });
});
