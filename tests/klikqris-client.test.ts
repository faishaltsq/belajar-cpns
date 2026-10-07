import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createKlikQrisTransaction,
  checkKlikQrisStatus,
  getKlikQrisBaseUrl,
} from '@/lib/klikqris';

describe('KlikQRIS Client Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects sandbox URL by default or when KLIKQRIS_ENV=sandbox', () => {
    expect(getKlikQrisBaseUrl('sandbox')).toBe('https://klikqris.com/api/sandbox');
    expect(getKlikQrisBaseUrl('production')).toBe('https://klikqris.com/api');
  });

  it('formats create transaction payload and handles successful API response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        message: 'Transaction Created Successfully',
        data: {
          order_id: 'INV-TEST-101',
          amount: '1000.00',
          amount_uniq: '12.00',
          total_amount: '1012.00',
          status: 'PENDING',
          qris_url: 'https://klikqris.com/storage/qris_api/qris_INV-TEST-101.png',
          expired_at: '2026-10-07 12:00:00',
          signature: 'mock-sig-123',
        },
      }),
    });
    global.fetch = mockFetch;

    const res = await createKlikQrisTransaction({
      orderId: 'INV-TEST-101',
      amount: 1000,
      keterangan: 'Test Pembayaran',
      apiKey: 'test-key',
      merchantId: 'test-merchant',
      env: 'sandbox',
    });

    expect(res.success).toBe(true);
    expect(res.orderId).toBe('INV-TEST-101');
    expect(res.totalAmount).toBe(1012);
    expect(res.qrisUrl).toContain('qris_INV-TEST-101.png');
  });

  it('generates mock QR code when API keys are not provided (dev mode)', async () => {
    delete process.env.KLIKQRIS_API_KEY;
    delete process.env.KLIKQRIS_MERCHANT_ID;

    const res = await createKlikQrisTransaction({
      orderId: 'INV-DEV-999',
      amount: 50000,
      env: 'sandbox',
    });

    expect(res.success).toBe(true);
    expect(res.orderId).toBe('INV-DEV-999');
    expect(res.qrisImage).toMatch(/^data:image\/png;base64,/);
    expect(res.status).toBe('PENDING');
  });

  it('checks status correctly from API', async () => {
    process.env.KLIKQRIS_API_KEY = 'mock_key';
    process.env.KLIKQRIS_MERCHANT_ID = 'mock_merchant';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          order_id: 'INV-TEST-101',
          status: 'SUCCESS',
          paid_at: '2026-10-07 12:05:00',
          signature: 'sig-paid',
        },
      }),
    });
    global.fetch = mockFetch;

    const statusRes = await checkKlikQrisStatus('INV-TEST-101');
    expect(statusRes.success).toBe(true);
    expect(statusRes.status).toBe('PAID');
    expect(statusRes.paidAt).toBe('2026-10-07 12:05:00');
  });
});
