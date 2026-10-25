import { describe, it, expect } from 'vitest';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { pageMeta, NOINDEX, SITE_URL } from '@/lib/seo';
import { generateMetadata as tryoutMeta } from '@/app/simulasi/[id]/layout';
import { generateMetadata as drillMeta } from '@/app/drill/[category]/[subCategory]/layout';
import { DRILL_CONTENT } from '@/data/drillContent';
import { DRILL_TOPICS } from '@/lib/drillHelper';
import { TRYOUT_LIST } from '@/lib/loadPackage';
import { TRYOUT_SEO } from '@/data/tryoutSeo';
import kepribadianQuestions from '@/data/psikotes_kepribadian.json';
import { evaluateKepribadianResults } from '@/lib/kepribadian';
import { metadata as kepribadianMeta } from '@/app/psikotes/kepribadian/layout';

describe('SEO & Search Engine Indexing Suite', () => {
  it('robots.txt points to canonical lolosin.com sitemap and allows public paths', () => {
    const config = robots();
    expect(config.sitemap).toBe('https://lolosin.com/sitemap.xml');
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules.allow).toBe('/');
    expect(rules.disallow).toContain('/api/');
    expect(rules.disallow).toContain('/admin-kelola/');
    expect(rules.disallow).toContain('/profil/');
    expect(rules.disallow).toContain('/login/');
    expect(rules.disallow).toContain('/simulasi/hasil/');
  });

  it('sitemap contains canonical domain and all indexable hubs', () => {
    const items = sitemap();
    const urls = items.map((i) => i.url);

    expect(urls.some((u) => u.includes('https://lolos.in'))).toBe(false);
    expect(urls).toContain('https://lolosin.com');
    expect(urls).toContain('https://lolosin.com/simulasi');
    expect(urls).toContain('https://lolosin.com/psikotes');
    expect(urls).toContain('https://lolosin.com/drill');
    expect(urls).toContain('https://lolosin.com/flashcard');
    expect(urls).toContain('https://lolosin.com/journey');
    expect(urls).toContain('https://lolosin.com/psikotes/kraepelin');
    expect(urls).toContain('https://lolosin.com/drill/TWK/Pancasila');
    expect(urls).toContain('https://lolosin.com/drill/TKP/Pelayanan%20Publik');
    expect(urls).toContain('https://lolosin.com/simulasi/tryout-1');
  });

  it('sitemap never lists private or noindex routes', () => {
    const urls = sitemap().map((i) => i.url);
    const privatePaths = ['/login', '/profil', '/riwayat', '/rekap', '/admin-kelola', '/psikotes/hasil', '/simulasi/hasil', '/drill/ulang-salah'];
    for (const p of privatePaths) {
      expect(urls.some((u) => u === `${SITE_URL}${p}` || u.startsWith(`${SITE_URL}${p}/`))).toBe(false);
    }
  });

  it('pageMeta emits self-referential canonical, not the site root', () => {
    const meta = pageMeta({ title: 'T', description: 'D', path: '/psikotes/kraepelin' });
    expect(meta.alternates?.canonical).toBe('https://lolosin.com/psikotes/kraepelin');
    expect(meta.openGraph?.url).toBe('https://lolosin.com/psikotes/kraepelin');
  });

  it('pageMeta root path resolves to bare origin', () => {
    expect(pageMeta({ title: 'T', description: 'D', path: '/' }).alternates?.canonical).toBe('https://lolosin.com');
  });

  it('NOINDEX blocks indexing but keeps link equity', () => {
    expect(NOINDEX.robots).toEqual({ index: false, follow: true });
  });

  it('tryout detail metadata is unique per package with matching canonical', () => {
    const a = tryoutMeta({ params: { id: 'tryout-1' } });
    const b = tryoutMeta({ params: { id: 'tryout-figural-2' } });
    expect(a.title).not.toBe(b.title);
    expect(a.alternates?.canonical).toBe('https://lolosin.com/simulasi/tryout-1');
    expect(b.alternates?.canonical).toBe('https://lolosin.com/simulasi/tryout-figural-2');
  });

  it('unknown tryout id is noindexed instead of canonicalized', () => {
    const meta = tryoutMeta({ params: { id: 'does-not-exist' } });
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBeUndefined();
  });

  it('drill topic metadata canonical matches sitemap URL encoding', () => {
    const meta = drillMeta({ params: { category: 'TKP', subCategory: 'Pelayanan Publik' } });
    const expected = 'https://lolosin.com/drill/TKP/Pelayanan%20Publik';
    expect(meta.alternates?.canonical).toBe(expected);
    expect(sitemap().map((i) => i.url)).toContain(expected);
  });

  it('drill topic metadata handles URL-encoded params from Next router', () => {
    const meta = drillMeta({ params: { category: 'TKP', subCategory: 'Pelayanan%20Publik' } });
    expect(meta.alternates?.canonical).toBe('https://lolosin.com/drill/TKP/Pelayanan%20Publik');
  });

  it('unknown drill topic is noindexed', () => {
    const meta = drillMeta({ params: { category: 'TWK', subCategory: 'Bukan Topik' } });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe('Server-rendered SEO content', () => {
  it('every drill topic has unique material', () => {
    const topics = Object.keys(DRILL_CONTENT);
    expect(topics.length).toBe(18);

    const headings = new Set(topics.map((t) => DRILL_CONTENT[t].heading));
    expect(headings.size).toBe(topics.length);

    const intros = new Set(topics.map((t) => DRILL_CONTENT[t].intro));
    expect(intros.size).toBe(topics.length);

    for (const topic of topics) {
      const c = DRILL_CONTENT[topic];
      const chars = c.intro.length + c.sections.reduce((n, s) => n + s.body.join(' ').length, 0);
      expect(chars, `${topic} content too thin`).toBeGreaterThan(1000);
      expect(c.sections.length).toBeGreaterThanOrEqual(3);
      expect(c.tips.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('every drill topic in DRILL_TOPICS has material', () => {
    for (const t of DRILL_TOPICS) {
      expect(DRILL_CONTENT[t.subCategory], `missing content: ${t.subCategory}`).toBeDefined();
    }
  });

  it('every tryout package has its own topic signature', () => {
    for (const pkg of TRYOUT_LIST) {
      const seo = TRYOUT_SEO[pkg.id];
      expect(seo, `missing seo: ${pkg.id}`).toBeDefined();
      expect(seo.topics.length).toBeGreaterThan(0);
      const total = seo.breakdown.reduce((n, b) => n + b.count, 0);
      expect(total, `${pkg.id} breakdown mismatch`).toBe(pkg.questionCount);
    }
  });

  it('tryout descriptions are not duplicated across packages', () => {
    const descs = TRYOUT_LIST.map((p) => {
      const seo = TRYOUT_SEO[p.id];
      return `${p.label}: ${seo.breakdown.map((b) => `${b.count} ${b.category}`).join(', ')} | ${seo.topics.slice(0, 4).join(', ')}`;
    });
    expect(new Set(descs).size).toBe(descs.length);
  });
});

describe('sitemap lastmod is a real signal', () => {
  it('does not stamp every URL with the current time', () => {
    // A sitemap whose lastmod is always "now" teaches Google to ignore the
    // field, so a genuinely new page gets no freshness signal at all.
    const before = Date.now();
    const items = sitemap();
    const after = Date.now();

    for (const item of items) {
      const t = new Date(item.lastModified as string | Date).getTime();
      expect(t, `${item.url} lastmod looks like build time`).toBeLessThan(before);
      expect(t).toBeLessThan(after);
    }
  });

  it('groups pages by the data that actually fills them', () => {
    const items = sitemap();
    const byUrl = new Map(items.map((i) => [i.url, new Date(i.lastModified as string | Date).getTime()]));

    // Two tryout pages share their content source, so they must share lastmod.
    expect(byUrl.get('https://lolosin.com/simulasi/tryout-1')).toBe(
      byUrl.get('https://lolosin.com/simulasi/tryout-2')
    );
    // Every drill topic comes from one data file, so they move together.
    expect(byUrl.get('https://lolosin.com/drill/TWK/Pancasila')).toBe(
      byUrl.get('https://lolosin.com/drill/TIU/Analogi')
    );
    // Pages filled by unrelated sources must not share a stamp.
    expect(byUrl.get('https://lolosin.com/drill/TWK/Pancasila')).not.toBe(
      byUrl.get('https://lolosin.com/flashcard')
    );
  });
});

describe('Kepribadian meta description matches the delivered assessment', () => {
  it('advertises the real item count and no mismatched figure', () => {
    // Ground truth from the data and the scoring engine, never a literal here.
    const itemCount = kepribadianQuestions.length;
    const dimensionCount = Object.keys(evaluateKepribadianResults({}).dimensions).length;
    const desc = String(kepribadianMeta.description ?? '');

    expect(itemCount).toBeGreaterThan(0);
    expect(dimensionCount).toBeGreaterThan(0);

    // Every "<number> pasang|dimensi|butir" figure in the copy, extracted generically.
    const countsOf = (unit: string): number[] =>
      Array.from(desc.matchAll(new RegExp(`(\\d+)\\s+${unit}`, 'gi')), (m) => Number(m[1]));

    const pairCounts = countsOf('pasang');
    const dimensionCounts = countsOf('dimensi');
    const butirCounts = countsOf('butir');

    // The real figures must be present...
    expect(pairCounts, `description must advertise ${itemCount} pasang`).toContain(itemCount);
    expect(dimensionCounts, `description must advertise ${dimensionCount} dimensi`).toContain(dimensionCount);

    // ...and no stale figure may survive alongside them.
    for (const n of pairCounts) expect(n, `wrong item count in description: ${n} pasang`).toBe(itemCount);
    for (const n of dimensionCounts) expect(n, `wrong dimension count in description: ${n} dimensi`).toBe(dimensionCount);
    for (const n of butirCounts) expect(n, `wrong butir count in description: ${n} butir`).toBe(itemCount);

    expect(desc.length).toBeLessThan(160);
  });
});
