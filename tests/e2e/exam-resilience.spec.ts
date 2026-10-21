import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Regression coverage for three client-side defects that were fixed in the exam
 * engine but never exercised in a browser (docs/audit/BUG_REPORT.md P1-3, P1-4,
 * P1-5). All three live entirely in `ExamSession.tsx`, so a unit test can only
 * assert the shape of the code, not that a learner keeps their paper.
 *
 * The E2E server runs with DATABASE_URL='' by design: free packages come from
 * the static JSON, nothing persists, and the premium gate still has to refuse.
 * Every package used here is free (tryout-mini, tryout-1, tryout-2).
 *
 * What each case pins:
 *   P1-3  a failed submission keeps every draft key, releases the submit guard
 *         and offers a retry that actually succeeds; the dialog cannot be
 *         dismissed while the POST is in flight; the time-up path (no dialog)
 *         surfaces a retryable banner on the paper.
 *   P1-4  the mount effects do not touch storage until the auth probe has
 *         settled, so the key scope is final before the first read/write and a
 *         delayed /api/auth/me cannot swap the paper or restart the clock.
 *   P1-5  the submitted duration is clamped to the package's own duration, not
 *         to the removed EXAM_DURATION = 6000 constant.
 *
 * Not reachable in this environment, and therefore not asserted:
 *   - the 403-at-submit branch sets `lockedReason`, but the paywall screen only
 *     renders when `questions.length === 0` (ExamSession.tsx:567). Mid-exam the
 *     paper is loaded, so the 403 surfaces as the in-dialog error instead. The
 *     data-preservation half of that branch IS covered (case "403 at submit").
 *   - a genuinely signed-in account: the E2E server has no JWT_SECRET and no
 *     database, so the account scope is produced by answering /api/auth/me with
 *     a user object (the same wire contract the real route returns).
 */

const FREE = { mini: 'tryout-mini', one: 'tryout-1' } as const;

/** scopedKey() format: lolos_<guest|u_<id>>_exam_<part>_<packageId>. */
const k = {
  answers: (id: string, scope = 'guest') => `lolos_${scope}_exam_answers_${id}`,
  start: (id: string, scope = 'guest') => `lolos_${scope}_exam_start_${id}`,
  index: (id: string, scope = 'guest') => `lolos_${scope}_exam_index_${id}`,
  mode: (id: string, scope = 'guest') => `lolos_${scope}_exam_mode_${id}`,
  paused: (id: string, scope = 'guest') => `lolos_${scope}_exam_paused_at_${id}`,
};

const OPTION = 'button.flex-1.text-left';

function option(page: Page, n: number): Locator {
  return page.locator(OPTION).nth(n);
}

/** The selected option paints its letter chip with the primary colour. */
async function isSelected(page: Page, n: number): Promise<boolean> {
  const cls = (await option(page, n).locator('span').first().getAttribute('class')) ?? '';
  return cls.includes('bg-[var(--primary)]');
}

async function answerOption(page: Page, n: number) {
  await option(page, n).click();
  await expect
    .poll(async () => isSelected(page, n), { message: `option ${n} should show as selected` })
    .toBe(true);
}

async function read(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k2) => localStorage.getItem(k2), key);
}

async function readJson(page: Page, key: string): Promise<unknown> {
  return page.evaluate((k2) => {
    const raw = localStorage.getItem(k2);
    return raw ? JSON.parse(raw) : null;
  }, key);
}

/** Seed localStorage before any page script runs. */
async function seed(page: Page, entries: Record<string, string>) {
  await page.addInitScript((pairs) => {
    for (const [key, value] of Object.entries(pairs)) localStorage.setItem(key, value);
  }, entries);
}

/**
 * Wait for the paper to render. The mode dialog is avoided by seeding
 * `exam_mode_*` in the cases that need determinism; when it is not seeded the
 * first-visit dialog is dismissed the same way cat-tryout.spec.ts does.
 *
 * Readiness is the option buttons, not the question text: tryout-mini's stems
 * do not carry the "Soal nomor N" prefix that tryout-1's do, and the option
 * list only exists once questions are in state.
 */
async function openPaper(page: Page, id: string) {
  await expect(page.locator(OPTION).first()).toBeVisible({ timeout: 20_000 });

  const choice = page.getByRole('button', { name: /Mode Tryout Resmi/i }).first();
  await choice.waitFor({ state: 'visible', timeout: 3_000 }).catch(() => {});
  if (await choice.isVisible().catch(() => false)) await choice.click();
  await expect(page.getByText('Pilih Mode Ujian')).toHaveCount(0);
  await expect(page.locator(OPTION).first()).toBeVisible();
}

/**
 * The alert a learner actually reads. Next renders an always-present
 * `role="alert"` route announcer, so an unscoped getByRole('alert') is a strict
 * violation rather than a stronger assertion.
 */
function alertWith(page: Page, text: RegExp): Locator {
  return page.getByRole('alert').filter({ hasText: text });
}

/** Read the running countdown back as seconds. */
async function countdownSeconds(page: Page): Promise<number> {
  const text = (await page.getByText(/^\d{1,2}:\d{2}$/).first().textContent()) ?? '';
  const [m, s] = text.trim().split(':').map(Number);
  return m * 60 + s;
}

/**
 * Serve a package with a chosen meta.duration_sec.
 *
 * With no database the questions route hardcodes `duration_sec: 6000` (see
 * src/app/api/questions/[id]/route.ts:39), which is exactly the constant P1-5
 * was about — so a package whose real duration differs has to be supplied
 * through the same wire contract the DB-backed route uses. The response is the
 * real one with only `meta.duration_sec` replaced: same questions, same shape.
 */
async function serveDuration(page: Page, id: string, durationSec: number) {
  await page.route(`**/api/questions/${id}`, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.meta = { ...(body.meta ?? {}), duration_sec: durationSec };
    await route.fulfill({ response, json: body });
  });
}

/** Capture the next POST /api/results and return its parsed body. */
async function nextSubmission(page: Page) {
  const request = await page.waitForRequest(
    (r) => /\/api\/results$/.test(new URL(r.url()).pathname) && r.method() === 'POST',
    { timeout: 30_000 },
  );
  return request.postDataJSON() as { packageId: string; durationUsed: number; practice: boolean };
}

/** Keep each test in its own rate-limit bucket (the route keys on the last hop). */
test.beforeEach(async ({ page }, testInfo) => {
  const ip = `10.${testInfo.workerIndex % 200}.${(testInfo.parallelIndex + 1) % 200}.1`;
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip });
});

test.describe('Exam resilience (P1-3 / P1-4 / P1-5)', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // P1-3 — a failed submission must not destroy the paper
  // ───────────────────────────────────────────────────────────────────────────

  test('a failed submission keeps every draft key and the retry succeeds', async ({ page }) => {
    const id = FREE.one;
    await seed(page, { [k.mode(id)]: 'official' });
    await page.goto(`/simulasi/${id}`);
    await openPaper(page, id);

    await answerOption(page, 1);

    // The POST dies. Before the fix `catch {}` swallowed this, navigated away
    // with a NaN result and deleted the drafts — the paper was unrecoverable.
    await page.route('**/api/results', (route) =>
      route.fulfill({ status: 500, json: { error: 'upstream unavailable' } }),
    );

    await page.getByRole('button', { name: /^Selesai$/ }).first().click();
    await expect(page.getByRole('heading', { name: /Konfirmasi Selesai Ujian/ })).toBeVisible();
    await page.getByRole('button', { name: /^Kumpulkan$/ }).click();

    // The failure is surfaced, inside the dialog the learner still has open.
    await expect(alertWith(page, /Koneksi terputus saat mengirim jawaban/)).toBeVisible();
    const retry = page.getByRole('button', { name: 'Coba Kirim Ulang' });
    await expect(retry).toBeVisible();

    // The paper is still open and every draft survived.
    await expect(page).toHaveURL(new RegExp(`/simulasi/${id}$`));
    const answers = (await readJson(page, k.answers(id))) as Array<{ questionId: number; selectedOptionId: string }>;
    expect(answers).toHaveLength(1);
    expect(answers[0]).toMatchObject({ questionId: 1, selectedOptionId: 'B' });
    expect(Number(await read(page, k.start(id)))).toBeGreaterThan(0);
    expect(await read(page, k.index(id))).not.toBeNull();

    // Unblock the route: the guard was released, so the retry goes through.
    await page.unroute('**/api/results');
    const accepted = page.waitForResponse(
      (res) => /\/api\/results$/.test(new URL(res.url()).pathname) && res.request().method() === 'POST',
    );
    await retry.click();
    expect((await accepted).status()).toBe(200);

    await page.waitForURL(/\/simulasi\/hasil\//, { timeout: 30_000 });

    // Only now — result confirmed — is the draft retired.
    expect(await read(page, k.answers(id))).toBeNull();
    expect(await read(page, k.start(id))).toBeNull();
    expect(await read(page, k.index(id))).toBeNull();
  });

  test('the confirm dialog cannot be dismissed while a submission is in flight', async ({ page }) => {
    const id = FREE.one;
    await seed(page, { [k.mode(id)]: 'official' });
    await page.goto(`/simulasi/${id}`);
    await openPaper(page, id);

    await answerOption(page, 0);

    // Hold the POST open long enough to poke at the dialog.
    await page.route('**/api/results', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      await route.continue();
    });

    await page.getByRole('button', { name: /^Selesai$/ }).first().click();
    await page.getByRole('button', { name: /^Kumpulkan$/ }).click();

    const heading = page.getByRole('heading', { name: /Konfirmasi Selesai Ujian/ });
    await expect(page.getByRole('button', { name: /Mengirim/ })).toBeVisible();
    await expect(heading).toBeVisible();

    // Both buttons are disabled and the backdrop click is a no-op. Before the
    // fix the dialog closed on click and the POST outcome was invisible.
    await expect(page.getByRole('button', { name: /Lanjut Mengerjakan/ })).toBeDisabled();
    await page.mouse.click(4, 4);
    await expect(heading).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/simulasi/${id}$`));

    // …and the submission still lands.
    await page.waitForURL(/\/simulasi\/hasil\//, { timeout: 30_000 });
  });

  test('a 403 at submit keeps the paper and says access was lost', async ({ page }) => {
    const id = FREE.one;
    await seed(page, { [k.mode(id)]: 'official' });
    await page.goto(`/simulasi/${id}`);
    await openPaper(page, id);

    await answerOption(page, 2);

    await page.route('**/api/results', (route) =>
      route.fulfill({ status: 403, json: { error: 'Paket ini memerlukan akses berbayar.', reason: 'payment_required' } }),
    );

    await page.getByRole('button', { name: /^Selesai$/ }).first().click();
    await page.getByRole('button', { name: /^Kumpulkan$/ }).click();

    await expect(alertWith(page, /tidak lagi punya akses ke paket ini/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Coba Kirim Ulang' })).toBeVisible();

    // The paper is not thrown away and the drafts are intact.
    await expect(page.getByText(/Soal nomor 1/)).toBeVisible();
    expect((await readJson(page, k.answers(id))) as unknown[]).toHaveLength(1);
    expect(Number(await read(page, k.start(id)))).toBeGreaterThan(0);

    // Re-granting access lets the same paper go through without re-answering.
    await page.unroute('**/api/results');
    await page.getByRole('button', { name: 'Coba Kirim Ulang' }).click();
    await page.waitForURL(/\/simulasi\/hasil\//, { timeout: 30_000 });
  });

  test('a failed time-up submission shows a retryable banner on the paper', async ({ page }) => {
    const id = FREE.mini;
    // A 5-second paper that started a minute ago: the countdown is already at
    // zero, so the timer submits by itself with no dialog open.
    await serveDuration(page, id, 5);
    const startedAt = String(Date.now() - 60_000);
    await seed(page, { [k.mode(id)]: 'official', [k.start(id)]: startedAt });

    await page.route('**/api/results', (route) =>
      route.fulfill({ status: 500, json: { error: 'upstream unavailable' } }),
    );

    await page.goto(`/simulasi/${id}`);
    await expect(page.locator(OPTION).first()).toBeVisible({ timeout: 20_000 });

    // No dialog is open on the time-up path, so the failure has to be visible
    // on the paper itself or the learner sees nothing at all.
    const banner = alertWith(page, /Koneksi terputus saat mengirim jawaban/);
    await expect(banner).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /Konfirmasi Selesai Ujian/ })).toHaveCount(0);

    // The start timestamp — the thing that made the paper unrecoverable — is
    // untouched by the failed attempt.
    expect(await read(page, k.start(id))).toBe(startedAt);
    await expect(page).toHaveURL(new RegExp(`/simulasi/${id}$`));

    // The banner's retry opens the dialog, whose own retry now succeeds.
    await page.unroute('**/api/results');
    // A fixed banner at the bottom of a short viewport can sit partly outside
    // the visual viewport, so a default centre click lands on whatever is under
    // it. Scroll it into view first — a learner does exactly that — then click.
    await banner.scrollIntoViewIfNeeded();
    await banner.getByRole('button', { name: 'Coba Kirim Ulang' }).click();
    await expect(page.getByRole('heading', { name: /Konfirmasi Selesai Ujian/ })).toBeVisible();
    await page.getByRole('button', { name: 'Coba Kirim Ulang' }).click();
    await page.waitForURL(/\/simulasi\/hasil\//, { timeout: 30_000 });
  });

  test('the paper never overflows the viewport horizontally', async ({ page }) => {
    // Found while writing the case above: the nav row's three buttons were
    // wider than a 320px screen, so the document scrolled to 348px and the
    // fixed banner's retry button ended up mostly outside the visual viewport
    // (5.5px visible, centre click intercepted by the error text underneath).
    // The retry was therefore unreachable on the smallest supported phone.
    // ExamSession now drops the two nav labels below 360px; this pins it.
    const id = FREE.mini;
    // Seed the mode so the "Pilih Mode Ujian" dialog does not open. That dialog
    // is a separate overlay with its own width; measuring the paper's layout
    // with it on screen would measure the wrong element. Its own reachability
    // is covered by the cat-tryout suite.
    await seed(page, { [k.mode(id)]: 'official' });
    await page.goto(`/simulasi/${id}`);
    await expect(page.locator(OPTION).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /Pilih Mode Ujian/ })).toHaveCount(0);

    const box = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
    }));
    // Allow 1px of sub-pixel rounding, nothing more.
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);
    expect(box.innerWidth).toBeLessThanOrEqual(box.clientWidth + 1);

    // The nav row itself must sit inside the viewport. Anchor on the row's own
    // container and check the row, not a button's accessible name: below 360px
    // the two labels are hidden on purpose, and above lg the quick-jump button
    // is hidden too, so no single name exists across the whole matrix.
    const navRow = page
      .locator('div.flex.items-center.justify-between.gap-2')
      .filter({ has: page.locator('button.btn-primary') })
      .first();
    await expect(navRow).toBeVisible();
    const rowBox = await navRow.boundingBox();
    const viewport = page.viewportSize()!;
    expect(rowBox!.x).toBeGreaterThanOrEqual(0);
    expect(rowBox!.x + rowBox!.width).toBeLessThanOrEqual(viewport.width + 1);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // P1-4 — auth resolving mid-exam must not swap the paper
  // ───────────────────────────────────────────────────────────────────────────

  test('a delayed auth probe never lets the guest scope write storage', async ({ page }) => {
    const id = FREE.one;
    const userId = 'u-e2e-p14';
    const scope = `u_${userId}`;
    const startedAt = String(Date.now() - 3_000_000); // 50 of the paper's 100 minutes spent

    // An older account draft: question 5 answered, sitting on index 4.
    await seed(page, {
      [k.answers(id, scope)]: JSON.stringify([{ questionId: 5, selectedOptionId: 'C', isFlagged: false }]),
      [k.start(id, scope)]: startedAt,
      [k.index(id, scope)]: '4',
      [k.mode(id, scope)]: 'practice',
    });

    // Hold /api/auth/me open until the test says otherwise.
    let releaseAuth: () => void = () => {};
    const authGate = new Promise<void>((resolve) => {
      releaseAuth = resolve;
    });
    await page.route('**/api/auth/me', async (route) => {
      await authGate;
      await route.fulfill({
        json: { user: { id: userId, email: 'p14@example.test', name: 'P14', phone: null } },
      });
    });

    const questionsLoaded = page.waitForResponse((res) => /\/api\/questions\//.test(res.url()));
    await page.goto(`/simulasi/${id}`, { waitUntil: 'domcontentloaded' });
    await questionsLoaded;

    // The questions are already in the client; only the auth scope is unknown.
    // Dwell here so a render that ignores the gate has time to happen — that is
    // the defect: the paper used to mount under the guest scope and then re-read
    // an older account draft underneath the learner.
    await expect(page.getByText(/Menyiapkan sesi ujian/)).toBeVisible();
    await page.waitForTimeout(900);
    await expect(page.getByText(/Soal nomor 1/)).toHaveCount(0);
    expect(await read(page, k.start(id))).toBeNull();
    expect(await read(page, k.answers(id))).toBeNull();

    releaseAuth();

    // Scope is final now: the account draft is the one that loads, with its own
    // countdown rather than a fresh one.
    await expect(page.getByText(/Soal nomor 5/)).toBeVisible({ timeout: 20_000 });
    expect(await isSelected(page, 2)).toBe(true);
    const remaining = await countdownSeconds(page);
    expect(remaining).toBeGreaterThan(2_900);
    expect(remaining).toBeLessThanOrEqual(3_000);

    // The guest scope was never minted, so nothing can be re-read from it later.
    expect(await read(page, k.start(id))).toBeNull();
    expect(await read(page, k.answers(id))).toBeNull();
    expect(await read(page, k.index(id))).toBeNull();
    // …and the account draft is exactly what was seeded.
    expect(await read(page, k.start(id, scope))).toBe(startedAt);
  });

  test('a guest draft survives a delayed auth probe untouched', async ({ page }) => {
    const id = FREE.one;
    const startedAt = String(Date.now() - 120_000);
    await seed(page, {
      [k.answers(id)]: JSON.stringify([{ questionId: 3, selectedOptionId: 'D', isFlagged: false }]),
      [k.start(id)]: startedAt,
      [k.index(id)]: '2',
      [k.mode(id)]: 'official',
    });

    let releaseAuth: () => void = () => {};
    const authGate = new Promise<void>((resolve) => {
      releaseAuth = resolve;
    });
    await page.route('**/api/auth/me', async (route) => {
      await authGate;
      await route.fulfill({ json: { user: null } });
    });

    await page.goto(`/simulasi/${id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Menyiapkan sesi ujian/)).toBeVisible();
    await page.waitForTimeout(900);
    await expect(page.getByText(/Soal nomor 1/)).toHaveCount(0);

    releaseAuth();

    // The half-finished guest paper is restored as it was: same question, same
    // answer, same deadline — the countdown is not restarted at 100:00.
    await expect(page.getByText(/Soal nomor 3/)).toBeVisible({ timeout: 20_000 });
    expect(await isSelected(page, 3)).toBe(true);
    const remaining = await countdownSeconds(page);
    expect(remaining).toBeGreaterThan(5_865);
    expect(remaining).toBeLessThanOrEqual(5_880);
    expect(await read(page, k.start(id))).toBe(startedAt);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // P1-5 — the submitted duration is the package's, not the 6000 constant
  // ───────────────────────────────────────────────────────────────────────────

  test("reports the package's own duration past the old 6000-second cap", async ({ page }) => {
    const id = FREE.mini;
    // A 130-minute paper (7800 s) with 7000 s already spent. The old code
    // clamped the submission to EXAM_DURATION = 6000 and under-reported 17
    // minutes of a special-needs paper.
    await serveDuration(page, id, 7_800);
    await seed(page, { [k.mode(id)]: 'official', [k.start(id)]: String(Date.now() - 7_000_000) });

    const submitted = nextSubmission(page);
    await page.goto(`/simulasi/${id}`);
    await openPaper(page, id);
    await answerOption(page, 0);

    await page.getByRole('button', { name: /^Selesai$/ }).first().click();
    await page.getByRole('button', { name: /^Kumpulkan$/ }).click();

    const body = await submitted;
    expect(body.packageId).toBe(id);
    expect(body.durationUsed).toBeGreaterThan(6_000);
    expect(body.durationUsed).toBeGreaterThanOrEqual(7_000);
    expect(body.durationUsed).toBeLessThanOrEqual(7_800);
  });

  test('never reports more time than the package allows', async ({ page }) => {
    const id = FREE.mini;
    // A 30-minute paper (1800 s) left open for 4000 s. The old constant let the
    // submission claim 4000 s on a paper that is only 1800 s long.
    await serveDuration(page, id, 1_800);
    await seed(page, { [k.mode(id)]: 'official', [k.start(id)]: String(Date.now() - 4_000_000) });

    const submitted = nextSubmission(page);
    await page.goto(`/simulasi/${id}`);

    // The countdown is already past zero, so the timer submits on its own.
    const body = await submitted;
    expect(body.packageId).toBe(id);
    expect(body.durationUsed).toBe(1_800);
    expect(body.durationUsed).toBeLessThanOrEqual(1_800);
  });
});
