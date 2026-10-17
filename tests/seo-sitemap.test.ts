import { describe, it, expect } from 'vitest';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { pageMeta, NOINDEX, SITE_URL } from '@/lib/seo';
import { generateMetadata as tryoutMeta } from '@/app/simulasi/[id]/layout';
import { generateMetadata as drillMeta } from '@/app/drill/[category]/[subCategory]/layout';

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
