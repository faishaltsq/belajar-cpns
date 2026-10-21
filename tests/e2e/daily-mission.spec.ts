import { test, expect } from '@playwright/test';

/** Phase 6 / Feature 3 — daily mission card on /journey (guest storage). */

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('shows an unmet mission to a fresh visitor', async ({ page }) => {
  await page.goto('/journey');
  const card = page.getByRole('region', { name: 'Misi Harian' });
  await expect(card).toBeVisible();
  await expect(card.getByText(/Selesaikan 1 aktivitas lagi hari ini/)).toBeVisible();
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

test('a guest without a session is never shown a met mission, even with stored dates', async ({ page }) => {
  // src/app/journey/page.tsx:78-84 clears every piece of journey state when there
  // is no session ("tidak ada data leak"), so a guest's stored activity can never
  // reach the card. The met branch is pinned by tests/daily-mission.test.ts; it
  // needs a signed cpns_token to appear here, which the E2E server lacks by design.
  await page.goto('/');
  await page.evaluate(
    ([today, past]) =>
      localStorage.setItem('lolos_guest_journey_streak_dates', JSON.stringify([today, past])),
    [todayKey(), yesterdayKey()]
  );

  await page.goto('/journey');
  const stored = await page.evaluate(() => localStorage.getItem('lolos_guest_journey_streak_dates'));
  expect(stored).toContain(todayKey());

  const card = page.getByRole('region', { name: 'Misi Harian' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});
