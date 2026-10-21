import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 2.1 — homepage and navigation, across the five required viewports.
 *
 * Everything here is asserted against a production build. Console failures and
 * horizontal overflow are collected per page and reported with the offending
 * message, not swallowed.
 */

/**
 * Console output that is noise in a local run without external credentials.
 * `/_vercel/…` scripts are injected by @vercel/analytics and
 * @vercel/speed-insights and only exist inside Vercel's runtime — they 404 (with
 * a text/html MIME) on any other host, including `next start` in CI.
 */
const IGNORED_CONSOLE = [
  /favicon/i,
  /net::ERR_/i,
  /sentry/i,
  /analytics/i,
  /_vercel\//i,
  /speed-insights/i,
];

function collectProblems(page: Page) {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    const url = msg.location()?.url ?? '';
    if (IGNORED_CONSOLE.some((re) => re.test(`${text} ${url}`))) return;
    problems.push(`console: ${text}${url ? ` @ ${url}` : ''}`);
  });
  page.on('response', (res) => {
    if (res.status() < 400) return;
    const url = res.url();
    if (IGNORED_CONSOLE.some((re) => re.test(url))) return;
    problems.push(`http ${res.status()} ${url}`);
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  return problems;
}

/** True when the document scrolls sideways — a classic mobile-only layout bug. */
async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
}

test.describe('Homepage', () => {
  test('renders without console or hydration errors', async ({ page }) => {
    const problems = collectProblems(page);

    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();

    // Any hydration mismatch surfaces through React's console error path.
    expect(problems.filter((p) => /hydrat/i.test(p))).toEqual([]);

    // Give lazy hydration and client effects a beat before judging the rest.
    await page.waitForLoadState('networkidle');
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('has no unintended horizontal scrolling', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('primary CTA leads to the tryout catalogue', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /Mulai Simulasi CAT/i }).first();
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/simulasi$/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('internal links resolve and back/forward restore the page', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page.$$eval('a[href^="/"]', (anchors) =>
      Array.from(new Set(anchors.map((a) => a.getAttribute('href') || '')))
        .filter((h) => h.startsWith('/') && !h.startsWith('//'))
    );
    expect(hrefs.length).toBeGreaterThan(3);

    const broken: string[] = [];
    for (const href of hrefs) {
      const res = await request.get(href);
      if (res.status() >= 400) broken.push(`${href} → ${res.status()}`);
    }
    expect(broken, broken.join('\n')).toEqual([]);

    await page.getByRole('link', { name: /Mulai Simulasi CAT/i }).first().click();
    await expect(page).toHaveURL(/\/simulasi$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1').first()).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/simulasi$/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('is keyboard reachable from the top of the document', async ({ page }) => {
    await page.goto('/');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('Tab');

    const focusTag = await page.evaluate(() => document.activeElement?.tagName ?? '');
    expect(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'SUMMARY']).toContain(focusTag);

    // A visible focus indicator is part of the acceptance criteria.
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      const s = getComputedStyle(el);
      return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow };
    });
    expect(outline).not.toBeNull();
    const focused = outline!;
    const hasIndicator =
      (focused.outlineStyle !== 'none' && parseFloat(focused.outlineWidth) > 0) ||
      focused.boxShadow !== 'none';
    expect(hasIndicator).toBe(true);
  });

  test('keeps primary content inside the viewport at this size', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);

    const offscreen = await page.$$eval('h1, h2, a.btn-primary, a[href="/simulasi"]', (els) =>
      els.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > document.documentElement.clientWidth + 2 || r.left < -2);
      }).length
    );
    expect(offscreen, `${offscreen} element(s) rendered outside the viewport`).toBe(0);
  });
});

test.describe('Navigation targets', () => {
  const ROUTES = ['/', '/simulasi', '/flashcard', '/journey', '/psikotes', '/drill/ulang-salah'];

  for (const route of ROUTES) {
    test(`${route} renders`, async ({ page }) => {
      const problems = collectProblems(page);
      const res = await page.goto(route);
      expect(res?.status(), `${route} returned ${res?.status()}`).toBeLessThan(400);
      await expect(page.locator('h1, h2').first()).toBeVisible();
      expect(await hasHorizontalOverflow(page), `${route} scrolls sideways`).toBe(false);
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }
});
