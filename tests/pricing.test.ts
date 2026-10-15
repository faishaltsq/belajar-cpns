import { describe, it, expect, vi, afterEach } from 'vitest';
import { priceFor, isOrderType, PRICE_TABLE, validateBundlePackageIds, BUNDLE_SIZE, FREE_PACKAGE_IDS } from '@/lib/pricing';

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

// ---------------------------------------------------------
// Task 1.1: benefit copy must match what is actually gated
// ---------------------------------------------------------
describe('benefit copy honesty', () => {
  const read = async (rel: string) => {
    const fs = await import('fs');
    const path = await import('path');
    return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
  };

  const sections = async () => {
    const modal = await read('src/components/UpgradeProModal.tsx');
    const start = modal.indexOf("selectedPlan === 'pro' ? (");
    const mid = modal.indexOf(') : (', start);
    const end = modal.indexOf(')}', mid);
    return { pro: modal.slice(start, mid), single: modal.slice(mid, end) };
  };

  it('does not sell free features as PRO benefits', async () => {
    const { pro } = await sections();
    // /drill/[category]/[subCategory] never checks is_pro — it is free
    expect(pro).not.toMatch(/drill subkategori/i);
    expect(pro).not.toMatch(/Bank Soal 300/);
  });

  it('does not list the leaderboard as a paid single-package perk', async () => {
    const { single } = await sections();
    // the leaderboard is ungated and free for everyone
    expect(single).not.toMatch(/leaderboard nasional/i);
    expect(single).not.toMatch(/Analitik skor dan leaderboard/i);
  });

  it('lists the rekap soal salah as an explicit PRO-only benefit', async () => {
    const { pro } = await sections();
    expect(pro).toMatch(/rekap/i);
    expect(pro).toMatch(/salah/i);
  });

  it('publishes the new PRO price in the layout Product schema', async () => {
    const layout = await read('src/app/layout.tsx');
    expect(layout).toMatch(/price:\s*'59000'/);
    expect(layout).not.toMatch(/price:\s*'150000'/);
  });

  it('keeps the GA4 measurement id intact', async () => {
    const layout = await read('src/app/layout.tsx');
    expect(layout).toContain('G-FR0BKC6GX3');
  });
});

// ---------------------------------------------------------
// Task 1.2: the simulasi upsell banner must not mislabel price or perks
// ---------------------------------------------------------
describe('simulasi upsell banner', () => {
  const readSim = async () => {
    const fs = await import('fs');
    const path = await import('path');
    return fs.readFileSync(
      path.join(process.cwd(), 'src/app/simulasi/page.tsx'),
      'utf8'
    );
  };

  it('prices the PRO button at the PRO tier, not the single-package tier', async () => {
    const src = await readSim();
    const cta = src.match(/Upgrade PRO[^<]*<\/span>/)?.[0] ?? '';
    expect(cta).toContain('59.000');
    expect(cta).not.toContain('5.000');
  });

  it('does not advertise the free drill feature as a PRO perk', async () => {
    const src = await readSim();
    const banner = src.slice(
      src.indexOf('Banner benefit PRO'),
      src.indexOf('</button>', src.indexOf('Banner benefit PRO'))
    );
    // /drill/[category]/[subCategory] has no is_pro check anywhere
    expect(banner).not.toMatch(/Drill/);
  });

  it('states the package count from the shared constant', async () => {
    const src = await readSim();
    // TRYOUT_LIST.length, not a number that goes stale when a package is added
    expect(src).toMatch(/\{TOTAL_TRYOUT_PACKAGES\}/);
    expect(src).not.toMatch(/\d+ Paket CAT BKN/);
  });
});

// ---------------------------------------------------------
// Task 3.2: bundle selection validation
// ---------------------------------------------------------
describe('validateBundlePackageIds', () => {
  const free = new Set(FREE_PACKAGE_IDS);

  it('accepts exactly BUNDLE_SIZE paid packages', () => {
    const ids = ['tryout-4', 'tryout-5', 'tryout-6', 'tryout-7', 'tryout-8'];
    expect(BUNDLE_SIZE).toBe(5);
    const res = validateBundlePackageIds(ids, [], free);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.ids).toHaveLength(5);
  });

  it('rejects the wrong count', () => {
    expect(validateBundlePackageIds(['tryout-4'], [], free).ok).toBe(false);
    expect(validateBundlePackageIds([], [], free).ok).toBe(false);
  });

  it('rejects free packages', () => {
    const res = validateBundlePackageIds(
      ['tryout-mini', 'tryout-4', 'tryout-5', 'tryout-6', 'tryout-7'], [], free);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/gratis/i);
  });

  it('rejects packages the user already owns', () => {
    const res = validateBundlePackageIds(
      ['tryout-4', 'tryout-5', 'tryout-6', 'tryout-7', 'tryout-8'],
      ['tryout-6'], free);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/tryout-6/);
  });

  it('rejects duplicates in the selection', () => {
    const res = validateBundlePackageIds(
      ['tryout-4', 'tryout-4', 'tryout-5', 'tryout-6', 'tryout-7'], [], free);
    expect(res.ok).toBe(false);
  });

  it('rejects non-array input', () => {
    expect(validateBundlePackageIds('tryout-4' as any, [], free).ok).toBe(false);
    expect(validateBundlePackageIds(undefined as any, [], free).ok).toBe(false);
  });

  it('is the only definition of the free set the simulasi grid gates on', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.join(process.cwd(), 'src/app/simulasi/page.tsx'), 'utf8');
    // simulasi must read the set from pricing, not restate it as a literal —
    // two literals drift and a bundle would then sell a free package
    expect(src).toContain('FREE_PACKAGE_IDS');
    expect(src).not.toMatch(/FREE_IDS\s*=\s*new Set\(\s*\[/);
  });
});
