import { test, expect } from '@playwright/test';

/**
 * Phase 6 / Feature 2 — personal progress snapshot on /riwayat.
 *
 * What this file can and cannot verify, stated up front because it matters:
 *
 * - The card reads `history`, and `src/app/riwayat/page.tsx:110-114` wipes every
 *   `lolos_guest_exam_*` key for a visitor with no session, so a guest page load
 *   can never contain history. Seeding guest results and expecting the card was
 *   the wrong test — it failed on all five viewports (playwright-run-8.txt).
 * - A logged-in fixture would need a signed `cpns_token`, which needs
 *   `JWT_SECRET`; the E2E server runs without one by design. So the aggregation
 *   is pinned by unit tests (`tests/progress-analytics.test.ts`, 13 cases) and
 *   this file pins the guest behaviour the card depends on.
 */

const seededResults = () => {
  const base = Date.now();
  [
    ['tryout-1', 420, false, 3600],
    ['tryout-2', 480, false, 3400],
    ['tryout-3', 560, true, 3200],
  ].forEach(([pkg, score, passed, duration], i) => {
    localStorage.setItem(
      `lolos_guest_exam_result_${pkg}-${base - (3 - i) * 60000}`,
      JSON.stringify({
        totalScore: score,
        isPassedAll: passed,
        durationSeconds: duration,
        completedAt: new Date(Date.now() - (3 - i) * 86400000).toISOString(),
      })
    );
  });
};

test('a guest starting from a clean device sees no progress card', async ({ page }) => {
  await page.goto('/riwayat');
  await expect(page.getByRole('region', { name: 'Kemajuanmu' })).toHaveCount(0);
});

test('guest results are cleared on load, so the card stays absent', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(seededResults);

  await page.goto('/riwayat');
  await expect(page.getByRole('region', { name: 'Kemajuanmu' })).toHaveCount(0);

  // The purge is deliberate: a guest has no account to hold these results.
  const leftover = await page.evaluate(
    () => Object.keys(localStorage).filter((k) => k.startsWith('lolos_guest_exam_result_')).length
  );
  expect(leftover).toBe(0);
});

test('the history page still renders its own sections for a guest', async ({ page }) => {
  await page.goto('/riwayat');
  await expect(page.getByRole('heading', { name: /Riwayat & Paket/i })).toBeVisible();
  await expect(page.getByText(/Belum ada riwayat ujian yang diselesaikan/i)).toBeVisible();
});
