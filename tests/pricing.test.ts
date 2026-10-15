import { describe, it, expect, vi, afterEach } from 'vitest';
import { priceFor, isOrderType, PRICE_TABLE } from '@/lib/pricing';

describe('pricing module', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns server-authoritative prices that ignore client input', () => {
    expect(priceFor('single')).toBe(5000);
    expect(priceFor('pro')).toBe(59000);
    expect(priceFor('bundle')).toBe(18000);
  });

  it('exposes the same table through both helpers', () => {
    expect(priceFor('single')).toBe(PRICE_TABLE.single);
    expect(priceFor('bundle')).toBe(PRICE_TABLE.bundle);
    expect(priceFor('pro')).toBe(PRICE_TABLE.pro);
  });

  it('rejects unknown order types', () => {
    expect(isOrderType('single')).toBe(true);
    expect(isOrderType('pro')).toBe(true);
    expect(isOrderType('bundle')).toBe(true);
    expect(isOrderType('free')).toBe(false);
    expect(isOrderType('admin')).toBe(false);
    expect(isOrderType(undefined)).toBe(false);
    expect(isOrderType(42)).toBe(false);
    expect(isOrderType(null)).toBe(false);
  });

  it('makes PRO cheaper than buying all 34 paid packages individually', () => {
    const allSatuan = 34 * PRICE_TABLE.single;
    expect(PRICE_TABLE.pro).toBeLessThan(allSatuan);
    // break-even at 12 packages or fewer
    expect(Math.ceil(PRICE_TABLE.pro / PRICE_TABLE.single)).toBeLessThanOrEqual(12);
  });

  it('prices bundle between single and pro', () => {
    expect(PRICE_TABLE.single).toBeLessThan(PRICE_TABLE.bundle);
    expect(PRICE_TABLE.bundle).toBeLessThan(PRICE_TABLE.pro);
  });

  it('keeps the bundle below 5 individual packages so the tier is worth it', () => {
    expect(PRICE_TABLE.bundle).toBeLessThan(5 * PRICE_TABLE.single);
  });

  it('honours a valid env override', async () => {
    vi.stubEnv('KLIKQRIS_PRO_PRICE', '77000');
    vi.resetModules();
    const mod = await import('@/lib/pricing');
    expect(mod.priceFor('pro')).toBe(77000);
    // untouched entries keep their literals
    expect(mod.priceFor('single')).toBe(5000);
  });

  it('falls back to the literal when an env override is malformed', async () => {
    for (const bad of ['', 'abc', '0', '-5', '12.5']) {
      vi.stubEnv('KLIKQRIS_PRO_PRICE', bad);
      vi.resetModules();
      const mod = await import('@/lib/pricing');
      expect(mod.priceFor('pro')).toBe(59000);
    }
  });
});
