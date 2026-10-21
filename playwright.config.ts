import { defineConfig, devices } from '@playwright/test';

/**
 * E2E suite for lolosin.com.
 *
 * Runs against a production build (`npx next start`), not `next dev`: the QA
 * brief asks for behaviour, hydration and console cleanliness, and a dev server
 * reports warnings a user never sees.
 *
 * No payment is ever taken here — the payment flows are covered by the vitest
 * suite with the gateway mocked.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/** Viewport matrix required by the QA brief. */
const VIEWPORTS = [
  { name: 'desktop-1440', viewport: { width: 1440, height: 900 } },
  { name: 'laptop-1280', viewport: { width: 1280, height: 800 } },
  { name: 'tablet-768', viewport: { width: 768, height: 1024 } },
  { name: 'mobile-390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'mobile-320', viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true },
] as const;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: VIEWPORTS.map((v) => ({
    name: v.name,
    use: { ...devices['Desktop Chrome'], ...v },
  })),
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: BASE_URL,
    // Never reuse a hand-started server: it would carry whatever database the
    // person who started it had in their environment, which is often the real one.
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NODE_ENV: 'production',
      // E2E must never write to the production database. The app's own no-DB
      // mode (getDb() === null) is used instead: every lookup falls back to the
      // static package JSON, and nothing is persisted — no rows to overwrite and
      // no credentials to leak. It is also a genuine fail-closed scenario: the
      // premium gate still has to refuse a paid paper with no database behind it.
      // Passing a database at all is opt-in via E2E_DATABASE_URL.
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? '',
      POSTGRES_URL: process.env.E2E_DATABASE_URL ?? '',
    },
  },
});
