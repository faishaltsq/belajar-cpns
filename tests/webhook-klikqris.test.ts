import { describe, it, expect } from 'vitest';

/**
 * Logika ekstraksi dan validasi payload KlikQRIS Webhook
 * Berdasarkan implementasi di src/app/api/webhooks/klikqris/route.ts
 */
function parseKlikQrisPayload(body: Record<string, any>) {
  const rawOrderId = body.order_id || body.data?.order_id || '';
  const status = (body.status || body.data?.status || '').toUpperCase();
  const paidAmount = Number(body.total_amount || body.amount || body.data?.amount_paid || 0);

  if (!rawOrderId) {
    return { error: 'Missing order_id', status: 400 };
  }

  const match = String(rawOrderId).match(/\d+/);
  const orderId = match ? Number(match[0]) : null;

  if (!orderId) {
    return { error: 'Invalid order_id format', status: 400 };
  }

  return { orderId, status, paidAmount };
}

describe('KlikQRIS Webhook Payload Parser & Business Rules', () => {
  it('menolak payload tanpa order_id', () => {
    const res = parseKlikQrisPayload({});
    expect(res).toEqual({ error: 'Missing order_id', status: 400 });
  });

  it('menolak order_id tanpa angka numerik', () => {
    const res = parseKlikQrisPayload({ order_id: 'INV-ABC' });
    expect(res).toEqual({ error: 'Invalid order_id format', status: 400 });
  });

  it('berhasil memparsing order_id format INV-12345 (flat)', () => {
    const res = parseKlikQrisPayload({
      order_id: 'INV-12345',
      status: 'PAID',
      amount: 150000,
    });
    expect(res).toEqual({ orderId: 12345, status: 'PAID', paidAmount: 150000 });
  });

  it('berhasil memparsing payload format nested data (KlikQRIS v2)', () => {
    const res = parseKlikQrisPayload({
      data: {
        order_id: 'ORDER-9988',
        status: 'success',
        amount_paid: 5000,
      },
    });
    expect(res).toEqual({ orderId: 9988, status: 'SUCCESS', paidAmount: 5000 });
  });

  it('menangani status EXPIRED dengan benar', () => {
    const res = parseKlikQrisPayload({
      order_id: '123',
      status: 'expired',
    });
    expect(res.status).toBe('EXPIRED');
    expect(res.orderId).toBe(123);
  });
});
