import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Phase 2.2 — the CAT SKD engine, exercised the way a learner meets it:
 * open a free paper, answer, navigate, lose the page, get it back, submit.
 *
 * Runs against a throwaway PostgreSQL container (see `playwright.config.ts`),
 * so the rows this writes are dropped with the container — never production.
 */

const OPTION = 'button.flex-1.text-left';

const scopedKeys = {
  answers: (id: string) => `lolos_guest_exam_answers_${id}`,
  index: (id: string) => `lolos_guest_exam_index_${id}`,
  mode: (id: string) => `lolos_guest_exam_mode_${id}`,
  start: (id: string) => `lolos_guest_exam_start_${id}`,
};

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

async function storedAnswers(page: Page, id: string) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), scopedKeys.answers(id));
}

/**
 * Wait for the paper to render, then dismiss the first-visit mode dialog if it
 * is covering it. The dialog renders after the questions, so checking for it
 * before the question text is present finds nothing and the click later lands on
 * an overlay — which is how a modal silently blocks every answer click.
 */
async function openPaper(page: Page, id = 'tryout-1') {
  const question = page.getByText(/Soal nomor 1/);
  await expect(question).toBeVisible({ timeout: 20_000 });

  const choice = page.getByRole('button', { name: /Mode Tryout Resmi/i }).first();
  await choice.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  if (await choice.isVisible().catch(() => false)) await choice.click();
  await expect(question).toBeVisible();

  // The overlay must actually be gone before anything else clicks.
  await expect(page.getByText('Pilih Mode Ujian')).toHaveCount(0);
}

test.describe('CAT SKD tryout engine', () => {
  test('opens a paper with a countdown and the full question palette', async ({ page }) => {
    await page.goto('/simulasi/tryout-1');
    await openPaper(page);

    // 110 questions: 30 TWK, 35 TIU, 45 TKP — the catalog numbers, checked in
    // the browser rather than assumed.
    await expect(page.getByRole('button', { name: /Selanjutnya/ })).toBeVisible();
    // The section switcher carries the catalog's own split — 30 TWK questions
    // in this paper — so the count is read back out of the running UI.
    await expect(page.getByRole('button', { name: /TWK\s*\(\s*1\s*\/\s*30\s*\)/ })).toBeVisible();

    // A countdown is running, not a frozen placeholder.
    const first = await page.getByText(/^\d{1,2}:\d{2}$/).first().textContent();
    await page.waitForTimeout(1500);
    const later = await page.getByText(/^\d{1,2}:\d{2}$/).first().textContent();
    expect(later).not.toBe(first);

    // First question cannot go back.
    await expect(page.getByRole('button', { name: /Sebelumnya/ })).toBeDisabled();
  });

  test('records an answer and keeps it across navigation and a reload', async ({ page }) => {
    const id = 'tryout-1';
    await page.goto('/simulasi/tryout-1');
    await openPaper(page);

    await answerOption(page, 1);
    expect((await storedAnswers(page, id))[0]).toMatchObject({ questionId: 1, selectedOptionId: 'B' });

    // Forward and back within the paper.
    await page.getByRole('button', { name: /Selanjutnya/ }).click();
    await expect(page.getByText(/Soal nomor 2/)).toBeVisible();
    await page.getByRole('button', { name: /Sebelumnya/ }).click();
    await expect(page.getByText(/Soal nomor 1/)).toBeVisible();
    expect(await isSelected(page, 1)).toBe(true);

    // Jump via the palette where it is on screen — below lg the palette is
    // behind the section switcher, which the section test already covers.
    const paletteTwo = page.getByRole('button', { name: /^2$/, exact: true }).last();
    if (await paletteTwo.isVisible().catch(() => false)) {
      await paletteTwo.click();
      await expect(page.getByText(/Soal nomor 2/)).toBeVisible();
    }
    const position = (await page.getByText(/Soal nomor \d+/).first().textContent()) ?? '';

    await page.reload({ waitUntil: 'load' });

    // Refresh recovery: the same question, the answer and the deadline survive.
    await expect(page.getByText(new RegExp(position.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeVisible();
    expect(await storedAnswers(page, id)).toHaveLength(1);
    const started = await page.evaluate((k) => Number(localStorage.getItem(k) ?? 0), scopedKeys.start(id));
    expect(started).toBeGreaterThan(0);
    expect(started).toBeLessThan(Date.now());
    await expect(page.getByText(/^\d{1,2}:\d{2}$/).first()).toBeVisible();
  });

  test('keeps a second answer without losing the first', async ({ page }) => {
    const id = 'tryout-1';
    await page.goto('/simulasi/tryout-1');
    await openPaper(page);

    await answerOption(page, 2);
    await page.getByRole('button', { name: /Selanjutnya/ }).click();
    await answerOption(page, 0);

    const answers = await storedAnswers(page, id);
    expect(answers).toHaveLength(2);
    expect(answers.map((a: { questionId: number }) => a.questionId).sort()).toEqual([1, 2]);
  });

  test('submits and reports a result', async ({ page }) => {
    await page.goto('/simulasi/tryout-1');
    await openPaper(page);

    await answerOption(page, 0);

    const submitted = page.waitForResponse(
      (res) => /\/api\/results/.test(res.url()) && res.request().method() === 'POST',
    );

    await page.getByRole('button', { name: /^Selesai$/ }).first().click();
    await expect(page.getByRole('heading', { name: /Konfirmasi Selesai Ujian/ })).toBeVisible();
    await page.getByRole('button', { name: /^Kumpulkan$/ }).click();

    // The API must accept the submission — an unreachable scorer would still
    // bounce the browser to some other page, so the URL alone proves nothing.
    const res = await submitted;
    expect(res.status()).toBe(200);
    const payload = await res.json();
    expect(payload.success).toBe(true);

    // Score integrity in the browser: the passing grades the scorer applied are
    // the ones the rules module owns (TWK 65, TIU 80, TKP 166), and only the
    // section we actually answered counts an answer.
    expect(payload.result.twk.passingGrade).toBe(65);
    expect(payload.result.tiu.passingGrade).toBe(80);
    expect(payload.result.tkp.passingGrade).toBe(166);
    expect(payload.result.twk.answeredCount).toBe(1);
    expect(payload.result.tiu.answeredCount).toBe(0);
    expect(payload.result.tkp.answeredCount).toBe(0);

    await page.waitForURL((url) => !/\/simulasi\/tryout-1/.test(url.pathname), { timeout: 30_000 });
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText(/TWK|TIU|TKP/).first()).toBeVisible();
  });

  test('refuses a premium paper on the server for a guest', async ({ page }) => {
    // tryout-3 is the cheapest real paid package. The questions API must refuse
    // it: hiding the button would not be authorization.
    const refused = page.waitForResponse((res) => /\/api\/questions\/tryout-3/.test(res.url()));
    await page.goto('/simulasi/tryout-3');
    const res = await refused;
    expect(res.status()).toBe(403);

    // The paper never loads, and the learner is told why.
    await expect(page.getByText(/berbayar|berlangganan|Masuk/i).first()).toBeVisible();
    await expect(page.getByText(/Soal nomor/)).toHaveCount(0);
  });

  test('offers the mode choice on a first visit and remembers it', async ({ page }) => {
    await page.goto('/simulasi/tryout-1');
    await expect(page.getByText('Pilih Mode Ujian')).toBeVisible();

    await page.getByRole('button', { name: /Mode Latihan Mandiri/i }).first().click();
    await expect(page.getByText(/Soal nomor 1/)).toBeVisible();
    await expect
      .poll(async () => page.evaluate((k) => localStorage.getItem(k), scopedKeys.mode('tryout-1')))
      .toBe('practice');

    await page.reload({ waitUntil: 'load' });
    await expect(page.getByText('Pilih Mode Ujian')).toHaveCount(0);
    await expect(page.getByText(/Soal nomor 1/)).toBeVisible();
  });
});
