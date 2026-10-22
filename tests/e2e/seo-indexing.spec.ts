import { test, expect } from '@playwright/test';

/**
 * Phase SEO — server-rendered HTML and soft-404 behaviour.
 *
 * Everything here is asserted against the raw response body, not the rendered
 * DOM: the point is what a crawler sees before any JavaScript runs. A page
 * whose first HTML paint is "Memuat…" with no <h1> is, to Googlebot, an empty
 * page regardless of how good it looks in a browser.
 */

/** Strip scripts, styles and tags to approximate what a crawler extracts. */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CLIENT_ONLY_PAGES = ['/flashcard', '/journey', '/psikotes/penalaran'];

for (const route of CLIENT_ONLY_PAGES) {
  test(`${route} ships real content and one h1 before hydration`, async ({ request }) => {
    const res = await request.get(route);
    expect(res.status()).toBe(200);
    const html = await res.text();

    const h1s = html.match(/<h1[\s>]/g) ?? [];
    expect(h1s.length, `${route} must have exactly one <h1> in the initial HTML`).toBe(1);

    const words = visibleText(html).split(' ').filter(Boolean).length;
    expect(words, `${route} initial HTML is too thin (${words} words)`).toBeGreaterThan(300);

    // The loading placeholder must not be the only thing in the body.
    expect(html).not.toMatch(/<body[^>]*>\s*<div[^>]*>Memuat[^<]*<\/div>\s*<\/body>/);
  });
}

test('unknown tryout id answers 404, not a 200 "not found" page', async ({ request }) => {
  const res = await request.get('/simulasi/does-not-exist');
  expect(res.status()).toBe(404);
});

test('unknown drill category answers 404', async ({ request }) => {
  const res = await request.get('/drill/XYZ/Pancasila');
  expect(res.status()).toBe(404);
});

test('unknown drill subtopic answers 404', async ({ request }) => {
  const res = await request.get('/drill/TWK/BukanTopik');
  expect(res.status()).toBe(404);
});

test('known drill topic still answers 200 with its own canonical', async ({ request }) => {
  const res = await request.get('/drill/TKP/Pelayanan%20Publik');
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('href="https://lolosin.com/drill/TKP/Pelayanan%20Publik"');
});

test('sitemap lastmod is not the build time of this run', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();

  // `[...matchAll()]` needs a `target` of es2015 or higher; this tsconfig sets
  // no target, so the spread fails typecheck. Array.from matches the convention
  // already used in tests/pembahasan-quality.test.ts.
  const stamps = Array.from(xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)).map((m) => m[1]);
  expect(stamps.length).toBeGreaterThan(50);

  // Every URL sharing one timestamp that equals "right now" is the failure mode
  // this guards: Google then treats lastmod as meaningless.
  const nowIso = new Date().toISOString().slice(0, 10);
  const todays = stamps.filter((s) => s.startsWith(nowIso));
  expect(
    todays.length,
    `all ${stamps.length} lastmod values are today's date; lastmod carries no signal`
  ).toBeLessThan(stamps.length);
});
