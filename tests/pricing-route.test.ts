import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * The UI must show the same amounts `create-order` charges. P2-14: prices typed
 * into JSX ("Rp 59.000") drift the moment an env override changes them, so the
 * client reads this route instead.
 */

afterEach(() => {
  vi.resetModules();
  delete process.env.KLIKQRIS_PRO_PRICE;
  delete process.env.KLIKQRIS_BUNDLE_PRICE;
});

async function getResponse() {
  vi.resetModules();
  const mod = await import('@/app/api/pricing/route');
  return mod.GET();
}

describe('GET /api/pricing', () => {
  it('answers with the server-authoritative table and its labels', async () => {
    const res = await getResponse();
    const body = await res.json();
    expect(body).toMatchObject({ single: 5000, bundle: 18000, pro: 59000, bundleSize: 5 });
    expect(body.labels.pro).toBe('Rp 59.000');
    expect(body.labels.singleOfBundle).toBe('Rp 25.000');
  });

  it('follows an env override instead of a number typed into JSX', async () => {
    process.env.KLIKQRIS_PRO_PRICE = '75000';
    const res = await getResponse();
    const body = await res.json();
    expect(body.pro).toBe(75000);
    expect(body.labels.pro).toBe('Rp 75.000');
  });

  it('falls back when the override is not a usable integer', async () => {
    process.env.KLIKQRIS_PRO_PRICE = 'bukan-angka';
    const res = await getResponse();
    const body = await res.json();
    expect(body.pro).toBe(59000);
  });

  it('is cacheable — the price list carries no user data', async () => {
    const res = await getResponse();
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=300');
  });
});
