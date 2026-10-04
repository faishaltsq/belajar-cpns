import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock getDb
const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
}));

import { POST as saweriaWebhook } from '@/app/api/webhooks/saweria/route';

describe('Saweria Dynamic Price Webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles Pro upgrade when amount meets PRO threshold', async () => {
    mockSql
      .mockResolvedValueOnce([]) // existingTx
      .mockResolvedValueOnce([{ id: 'user-uuid-1', email: 'budi.test@example.com', is_pro: false, unlocked_packages: [] }]) // user
      .mockResolvedValueOnce([]) // update users
      .mockResolvedValueOnce([]); // insert transactions

    const payload = {
      id: `test-tx-pro-${Date.now()}`,
      amount_raw: 49000,
      donator_name: 'Budi Test',
      donator_email: 'budi.test@example.com',
      message: 'upgrade PRO budi.test@example.com',
    };

    const req = new NextRequest('http://localhost:3000/api/webhooks/saweria', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await saweriaWebhook(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.amount).toBe(49000);
    expect(json.targetEmail).toBe('budi.test@example.com');
    expect(json.upgradedPro).toBe(true);
  });

  it('handles single tryout unlock when amount is for single package', async () => {
    mockSql
      .mockResolvedValueOnce([]) // existingTx
      .mockResolvedValueOnce([{ id: 'user-uuid-2', email: 'ani.test@example.com', is_pro: false, unlocked_packages: [] }]) // user
      .mockResolvedValueOnce([]) // update users
      .mockResolvedValueOnce([]); // insert transactions

    const payload = {
      id: `test-tx-single-${Date.now()}`,
      amount_raw: 10000,
      donator_name: 'Ani Test',
      donator_email: 'ani.test@example.com',
      message: 'Akses tryout-8 ani.test@example.com',
    };

    const req = new NextRequest('http://localhost:3000/api/webhooks/saweria', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await saweriaWebhook(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.amount).toBe(10000);
    expect(json.targetPackageId).toBe('tryout-8');
    expect(json.unlockedPackage).toBe(true);
  });

  it('rejects invalid secret when expected secret is configured', async () => {
    process.env.SAWERIA_WEBHOOK_SECRET = 'my_super_secret';

    const req = new NextRequest('http://localhost:3000/api/webhooks/saweria?secret=wrong_secret', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await saweriaWebhook(req);
    expect(res.status).toBe(401);

    delete process.env.SAWERIA_WEBHOOK_SECRET;
  });
});

import { makeDynamicQris, crc16Ccitt, DEFAULT_BASE_QRIS } from '@/lib/saweria';

describe('Dynamic QRIS Synthesis', () => {
  it('correctly generates dynamic QRIS with custom nominal', () => {
    const qris10k = makeDynamicQris(DEFAULT_BASE_QRIS, 10000);
    expect(qris10k).toContain('540510000');
    expect(qris10k).toContain('5802ID');
    // Verify CRC16 integrity
    const payload = qris10k.slice(0, -4);
    const expectedCrc = crc16Ccitt(payload);
    expect(qris10k.slice(-4)).toBe(expectedCrc);
  });

  it('correctly sets dynamic initiation method tag 01 to 12', () => {
    const qris49k = makeDynamicQris(DEFAULT_BASE_QRIS, 49000);
    expect(qris49k.startsWith('000201010212')).toBe(true);
    expect(qris49k).toContain('540549000');
    const payload = qris49k.slice(0, -4);
    expect(qris49k.slice(-4)).toBe(crc16Ccitt(payload));
  });
});
