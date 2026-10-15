import { describe, it, expect } from 'vitest';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';

describe('SEO & Search Engine Indexing Suite', () => {
  it('robots.txt points to canonical lolosin.com sitemap and allows public paths', () => {
    const config = robots();
    expect(config.sitemap).toBe('https://lolosin.com/sitemap.xml');
    expect(config.rules).toBeDefined();
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules.allow).toBe('/');
    expect(rules.disallow).toContain('/api/');
    expect(rules.disallow).toContain('/admin-kelola/');
    expect(rules.disallow).toContain('/profil/');
  });

  it('sitemap contains canonical domain https://lolosin.com and core landing hubs', () => {
    const items = sitemap();
    expect(items.length).toBeGreaterThan(50);

    const urls = items.map((i) => i.url);

    // No stale lolos.in references
    expect(urls.some((u) => u.includes('https://lolos.in'))).toBe(false);

    // Root and core hubs
    expect(urls).toContain('https://lolosin.com');
    expect(urls).toContain('https://lolosin.com/simulasi');
    expect(urls).toContain('https://lolosin.com/psikotes');
    expect(urls).toContain('https://lolosin.com/drill');
    expect(urls).toContain('https://lolosin.com/flashcard');
    expect(urls).toContain('https://lolosin.com/journey');

    // Psikotes submodules
    expect(urls).toContain('https://lolosin.com/psikotes/kraepelin');
    expect(urls).toContain('https://lolosin.com/psikotes/kecermatan-angka');
    expect(urls).toContain('https://lolosin.com/psikotes/kecermatan-huruf');
    expect(urls).toContain('https://lolosin.com/psikotes/kepribadian');
    expect(urls).toContain('https://lolosin.com/psikotes/penalaran');

    // Drill categories
    expect(urls).toContain('https://lolosin.com/drill/TWK/Pancasila');
    expect(urls).toContain('https://lolosin.com/drill/TIU/Analogi');
    expect(urls).toContain('https://lolosin.com/drill/TKP/Pelayanan%20Publik');

    // Tryouts
    expect(urls).toContain('https://lolosin.com/simulasi/tryout-1');
  });
});
