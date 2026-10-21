# Bug Report — Lolosin.com

Status legend: **FIXED** (code change landed and covered), **OPEN** (verified, not yet fixed), **NOT RUN** (not exercised — never labelled PASS).

Evidence standard used here: every "verified" claim is backed by a file path, an executed command, or an automated test that actually ran. Anything read but not executed is a hypothesis and is marked as such.

Last full verification in this session (2026-10-21): `npx vitest run` → **56 files / 635 tests passed**, `npx tsc --noEmit` → clean, `npx next build` → compiled successfully (log: `docs/audit/build-log-current-tree.txt`), `npx playwright test` → **90 / 90 passed** across 1440/1280/768/390/320 (log: `docs/audit/playwright-run-5.txt`). Results detail: `docs/testing/TEST_RESULTS.md`.

---

## P0 — Critical

### P0-1 · Paid packages were served to anyone (premium authorization bypass)

- **Severity:** P0
- **Affected feature:** CAT SKD tryout engine, leaderboard, drill
- **Status:** FIXED
- **Root cause:** Premium access was a UI concern only. `GET /api/questions/[id]`, `POST /api/results` and `POST /api/drill/check` never consulted the account or its entitlements, so a lock drawn on a catalog card was the entire paywall. Any visitor could `GET` a paid package's full question set, submit it, put a score on the official leaderboard, and — via drill — walk the paid answer key one question at a time including the explanation.
- **Evidence:**
  - `src/app/api/questions/[id]/route.ts` — no session read, no entitlement check, `Cache-Control` public for every package including paid ones.
  - `src/app/api/results/route.ts` — scored and called `saveExamResult` for any `packageId`.
  - `src/app/api/drill/check/route.ts` — returned `correctOptionId` + `explanation` for any `packageId`.
- **Fix:** new `src/lib/entitlement.ts` (`checkPackageAccess`, `getSessionUserId`, `packageCacheControl`) as the single decision point, enforced in all three routes before any package is loaded or scored. Rules: `FREE_PACKAGE_IDS` (`tryout-mini`, `tryout-1`, `tryout-2`) stay open to guests; everything else requires a signed-in account that is PRO or holds that package in `unlocked_packages`; an id outside the published catalog is treated as paid; a missing/unreachable database fails closed to free-only. Paid payloads are `Cache-Control: private, no-store` so the CDN cannot hand them to the next visitor.
- **Regression test:** `tests/entitlement-gate.test.ts` — 21 tests covering the decision table, each route's wiring, the 403 reasons, guest access to free packages, and that the served payload still carries no `score`/`explanation`.
- **Remaining risk:** `GET /api/results/[id]/review` and the paid packages themselves were not re-audited in this pass beyond the entitlement gate. No DB migration was applied — this change needs no schema change.

### P0-2 · Latihan Mandiri (practice mode) produced NaN scores

- **Severity:** P0
- **Affected feature:** Exam engine, results page
- **Status:** FIXED
- **Root cause:** `/api/questions/[id]` deliberately strips `options[].score` and `explanation` (`src/lib/questionPayload.ts`) so the key never ships mid-exam. `ExamSession` only called the server for scoring when `EXAM_MODES[examType].publishToLeaderboard` was true, so a practice paper fell back to a local `calculateExamScore` over the public payload — summing `options[].score` that no longer exists. `totalScore` and the per-category scores came out as `NaN`, which the results page rendered as `NaN`.
- **Evidence:** `src/app/simulasi/[id]/ExamSession.tsx` (pre-fix) — local computation was the only path for `examType === 'practice'`; `src/lib/questionPayload.ts:28-45` confirms the stripped shape.
- **Fix:** the server is now the only scorer. Practice submissions are POSTed with `practice: true`, scored server-side, and returned with `id: null` plus a `review` payload (the result's key + explanations, which a practice result has no row to look up later). They are deliberately **not** persisted: `exam_results` has no column marking a row as unofficial, so writing them would put a Latihan Mandiri score on the package's official leaderboard.
- **Regression test:** `tests/entitlement-gate.test.ts` → "scores a practice submission but never writes it to the leaderboard", "returns the review payload for a practice submission so its results page works", "still persists an official submission for the session account", "ignores a forged totalScore regardless of the mode".
- **Known limitation (OPEN):** practice results still have no server-side history, because adding the `mode` column is a migration. Migration `migrations/0NN_add_exam_result_mode.sql` would remove the restriction; it must be applied manually (`node scripts/apply-migration.mjs migrations/…`) and has **not** been run.

---

## P1 — High

### P1-3 · A failed submission silently destroyed the paper

- **Severity:** P1
- **Affected feature:** Exam submission, autosave/recovery
- **Status:** FIXED (server/client logic); browser-level recovery is **NOT RUN**
- **Root cause:** `submitExam` wrapped the POST in `catch {}` and carried on regardless. On a network drop it navigated to the results page with a locally-computed (P0-2: `NaN`) result, then removed the draft keys — so the answers and the original start timestamp were gone and the learner had no way back. Nothing surfaced the failure.
- **Fix:** drafts (`exam_answers_…`, `exam_start_…`, `exam_index_…`, `exam_paused_at_…`) are now removed **only after** the server result is confirmed. A failed POST keeps every draft, releases the submit guard, and surfaces the failure: `FinishExamModal` renders an error with a "Coba Kirim Ulang" button and cannot be dismissed while a submission is in flight; the time-up path (no dialog open) gets a retryable banner on the paper itself. A 403 at submit time re-uses the paywall screen instead of pretending to fail.
- **Regression test:** unit coverage for the failure path is **NOT RUN** — it needs a browser-level test (the flow lives entirely in the client). The server-side half is covered by the existing `/api/results` tests.

### P1-4 · Auth resolving mid-exam swapped the working paper

- **Severity:** P1
- **Affected feature:** Exam session state, autosave
- **Status:** FIXED
- **Root cause:** `useUser()` resolves asynchronously, so `userId` is `null` on the first render and populates ~200 ms later. Every exam key is scoped by `scopedKey(name, userId)`. The mount effect that restores answers, index and mode, and the effect that seeds `exam_start_*`, both ran with the guest scope — then re-ran under the account scope, reading an older account draft in place of the half-finished guest paper and resetting the countdown.
- **Fix:** both effects wait for `userLoading === false` before touching storage, so the key scope is final before any read or write. The leave-confirmation guards (`beforeunload`, `popstate`) are armed only once a paper is actually open, so a visitor who lands on a locked package no longer gets a browser "leave site?" dialog or a trapped back button.
- **Regression test:** **NOT RUN** (client-side timing behaviour).

### P1-5 · Submitted duration was capped at the wrong constant

- **Severity:** P1
- **Affected feature:** Exam scoring, special-needs duration
- **Status:** FIXED
- **Root cause:** `submitExam` clamped `durationSeconds` to the hardcoded `EXAM_DURATION = 6000` instead of the package's configured duration. A package with a longer duration (e.g. a 130-minute paper) reported a submitted duration of at most 100 minutes.
- **Fix:** clamped to `examDuration`, which comes from the package `meta.duration_sec`; the now-unused constant was removed.
- **Regression test:** **NOT RUN** (client-side).

### P1-6 · A practice pause was still charged against the paper

- **Severity:** P1
- **Affected feature:** Practice mode, exam timing
- **Status:** FIXED
- **Root cause:** `exam_start_*` stores an absolute wall-clock timestamp — correct for an official paper, wrong for a pauseable one. Pausing stopped the displayed countdown inside `<Timer/>` (which accumulates its own pause debt) but never moved the deadline, so paused minutes were still charged into `durationUsed`, and because the value is wall-clock, closing the tab while paused spent them permanently.
- **Fix:** on resume the deadline is shifted forward by the pause length; the pause start is persisted (`exam_paused_at_*`) so a reload inside an open pause gives the time back; a stale marker older than the whole paper is discarded rather than credited (crediting one would push the deadline past "now" and auto-submit a fresh paper on open). Clock arithmetic lives in `src/lib/examClock.ts` as pure functions taking `now` as an argument.
- **Regression test:** `tests/exam-clock.test.ts` — 10 tests covering credit, non-positive pause, stale-marker rejection, clamp to paper length, garbage timestamps, and the backward-clock case (which previously produced `initialSeconds > examDuration`, i.e. free minutes after a clock skew).

---

### P1-7 · A replayed EXPIRED webhook could unpick a paid order

- **Severity:** P1
- **Affected feature:** Payment integrity
- **Status:** FIXED
- **Root cause:** the `EXPIRED` branch wrote `SET status = 'expired'` with no status guard, while the `PAID` branch guards on `AND status = 'pending'`. A late or replayed `EXPIRED` delivery therefore flipped an already-paid order back to `expired`. The entitlement itself stayed granted, but the history lied — and because the idempotency check reads `status === 'paid'`, the *next* `PAID` delivery passed it and ran the grant a second time.
- **Fix:** `UPDATE payment_orders … WHERE id = ? AND status = 'pending' RETURNING id`; zero rows → `Already processed`.
- **Regression test:** `tests/payment-grant-integrity.test.ts` → "never touches an order that is already paid", "treats a guarded expiry that matched no row as already processed".

### P1-8 · Two simultaneous entitlement grants could drop one unlock

- **Severity:** P1
- **Affected feature:** Payment → entitlement
- **Status:** FIXED (SQL semantics verified against a real PostgreSQL 16 in Docker)
- **Root cause:** `grantEntitlement` did `SELECT unlocked_packages` then rewrote the whole array — a read-modify-write. `getDb()` is the Neon **HTTP** driver: every statement runs standalone, there is no transaction and no `FOR UPDATE` to hold across the gap, so two grants aimed at the same user (a bundle and a single package, or two tabs) could each read the old array and the second write would erase the first unlock.
- **Fix:** one self-contained `UPDATE` that appends only the ids not already present (`COALESCE(unlocked_packages, '[]'::jsonb) || (SELECT jsonb_agg(DISTINCT missing) … WHERE NOT … ? missing)`). Old merge behaviour kept: no duplicates, existing order preserved.
- **Evidence:** statement executed against PostgreSQL 16 in Docker — `NULL` column + new id → `["tryout-figural"]`; partial overlap `["tryout-1"]` + grant `["tryout-1","tryout-2"]` → `["tryout-1","tryout-2"]` (no duplicate).
- **Regression test:** `tests/payment-grant-integrity.test.ts` — asserts the grant issues exactly one statement and never a `SELECT unlocked_packages` first, plus the PRO/bundle/unknown-type/email-fallback table.

### P1-9 · Daily streak read 0 for seven hours every morning

- **Severity:** P1
- **Affected feature:** Roadmap Belajar, daily habit features
- **Status:** FIXED
- **Root cause:** `src/app/journey/page.tsx` records a streak day with a **local** date (`todayStr()`), while `calcStreak` compared it to `toISOString().slice(0, 10)` — a **UTC** date. For a UTC+7 learner between 00:00 and 07:00 local the two differ by a day, so nothing matched and the counter returned 0 even though the page still showed today as logged.
- **Fix:** `src/lib/journeyHelper.ts` works on local calendar dates (`localDateKey`, `previousDayKey`) and takes an injectable `now` for tests; month, year and leap-day stepping handled by local date arithmetic instead of `±86400000` ms.
- **Regression test:** `tests/streak-timezone.test.ts` — 9 tests, expectations built with `localDateKey` so they hold in any timezone and fail against the UTC comparison whenever local ≠ UTC. The pre-existing `tests/qa-agent-ancillary.test.ts` streak test was a time bomb: it only passed during 07:00–24:00 WIB.

---

## P2 — Medium

### P2-7 · Leave-confirmation handlers fired on the paywall screen

- **Severity:** P2
- **Affected feature:** Exam navigation
- **Status:** FIXED (as part of P1-4)
- **Detail:** `beforeunload` was registered on mount and `popstate` pushed a dummy history entry unconditionally, before any question had loaded. A visitor who landed on a locked or missing package got a browser dialog when leaving and a back button that bounced them back into the same screen.
- **Fix:** both handlers are gated on `questions.length > 0`.

### P2-8 · Submission state had no visual feedback

- **Severity:** P2
- **Affected feature:** Exam submission
- **Status:** FIXED
- **Detail:** the confirm dialog closed on click and nothing indicated whether the POST had succeeded, so a second click could re-enter `submitExam` (only the `submittingRef` re-entry guard stood in the way).
- **Fix:** `FinishExamModal` gained `isSubmitting` and `errorMessage`; while submitting, the backdrop is not dismissible, both buttons are disabled and the primary button shows "Mengirim…". The dialog is no longer closed optimistically before the POST resolves.

### P2-9 · Catalog counts, exam year and passing grades had no single source

- **Severity:** P2 (marketing/SEO accuracy, drift risk)
- **Affected feature:** Homepage, metadata, footer, profile, manifest, OG image
- **Status:** FIXED
- **Root cause:** numbers were typed wherever they appeared. Verified mismatches:
  - metadata claimed "37 paket tryout 110 butir" while only **34 of 37** packages are 110 butir (the rest are 30/46/82);
  - the homepage CTA offered "6 paket tryout … tanpa biaya" while the catalog publishes **37** packages and exactly **3** are free;
  - `PASSING_GRADES` 65/80/166 were restated in `scoring.ts`, `Footer.tsx` and `profil/page.tsx`, and the profile page called the grade "Resmi BKN **2024**" while the footer called it "Info Seleksi **2027**".
- **Fix:** `src/lib/examRules.ts` owns the year, passing grades, limits and the rules' provenance (`verification: 'reference'` until someone cites a regulation for `EXAM_YEAR`); `src/lib/tryoutCatalog.ts` holds the pure catalog (split out of `loadPackage.ts`, which pulled `getDb()` + `@neondatabase/serverless` into client bundles); `src/lib/catalogStats.ts` derives every count from it. Consumers updated: root layout (title/description/OG/twitter/JSON-LD), homepage, `manifest.ts`, `opengraph-image.tsx`, `/simulasi` layout, footer, profile.
- **Regression test:** `tests/content-consistency.test.ts` — counts must equal the catalog, no file may restate a catalog headline number, every `CPNS <year>` in `src/` must equal `EXAM_YEAR`, and the 65/80/166 trio may not be written by hand outside the two owner modules.

### P2-10 · Webhook tests leaked queued rows between cases

- **Severity:** P2 (test-trustworthiness)
- **Affected feature:** Payment test suite
- **Status:** FIXED
- **Root cause:** `klikqris-payment.test.ts` used `mockResolvedValueOnce` with `vi.clearAllMocks()` in `beforeEach`. Once-queues survive a clear, so when a handler started issuing one query fewer (P1-8 removed a `SELECT`), the leftover row was handed to the *next* test's first query — a signature test then read the wrong order and returned 404 instead of 403.
- **Fix:** `mockSql.mockReset()` in `beforeEach`. Every test in that file then supplied its own rows — 12/12 green, so none had been silently depending on leakage.

### P2-11 · The migrations do not create `payment_orders`

- **Severity:** P2 (operability)
- **Affected feature:** Payments, environment provisioning
- **Status:** OPEN — documented, not fixed (the real column set lives in the production database and was not guessed at)
- **Evidence:** `migrations/007`, `008`, `011` all `ALTER TABLE payment_orders`, but no file in `migrations/` or `supabase/` contains a `CREATE TABLE` for it. Reproduced by replaying the migration set into an empty PostgreSQL 16 database: `007_add_signature_to_payment_orders.sql` fails with `relation "payment_orders" does not exist`.
- **Consequence:** A fresh environment cannot be provisioned from the repository. Anyone setting up a staging database, or recovering after a restore, discovers this at migration time — after believing the migration set is complete.
- **Expected:** Either a migration that creates the table, or a README note that payments require a manual step and where the definition lives.

### P2-12 · The data layer only speaks Neon's SQL-over-HTTP dialect

- **Severity:** P2 (operability, vendor lock-in)
- **Affected feature:** `src/lib/db.ts` — every database read and write
- **Status:** OPEN — documented, not changed (switching the driver is an architecture decision, not an audit fix)
- **Evidence:** `getDb()` returns `neon(url)`, which issues HTTP requests to the database. Pointing `DATABASE_URL` at a ordinary PostgreSQL server makes the first query fail with `TypeError: Invalid URL ... input: 'https://api.0.0.1/sql'` — the driver rewrites the connection string into a Neon-style endpoint.
- **Consequence:** The application cannot be run against a standard Postgres (local Docker, a self-hosted instance, a restore drill) without a Neon-compatible HTTP proxy. It also means "the app works with the database down" is not merely a fail-safe posture — it is the only mode available off Neon.
- **Expected:** A driver that negotiates transport (`Pool` for TCP, `neon()` for HTTP), or an explicit statement in the deployment docs that Neon's HTTP endpoint is a hard requirement.

---

## Not verified in this session

These are audit candidates carried forward, not confirmed defects:

- Score-integrity against the *official* passing grade for the applicable recruitment year — the constants in `src/lib/examMode.ts` / scoring were read but not cross-checked against a regulation source, so they are treated as simulation rules until someone cites one.
- Psychometric modules (Kraepelin, kecermatan, penalaran, kepribadian, PAPI) — the modules exist and have tests, but the labelling ("not an officially validated diagnostic instrument") was not audited.
- Payment webhook duplicate handling and entitlement expiry — the duplicate-delivery scenario is now covered by `tests/payment-grant-integrity.test.ts` (including the EXPIRED replay path), but no expiry-of-entitlement-after-purchase test exists.
- Exam timer behaviour for a screen reader — the visual timer is asserted in the browser, its accessible name and announcements are not.

---

## Sprint 1 — continuation (sub-agent audit findings)

**P1-10 · Catalog totals on the homepage were typed by hand and stale**
- **Severity:** P1 · **Affected feature:** Homepage stats bar, OG image
- **Status:** FIXED
- **Root cause:** `src/app/page.tsx:107-108` wrote the literals `36 Paket` / `3.816 Soal` while the catalog publishes 37 packages and 3.898 questions (`src/lib/catalogStats.ts`). `src/app/opengraph-image.tsx:99` typed `37 Paket` — correct today, stale by the next package launch.
- **Fix:** both surfaces read `CATALOG_TOTAL` / `CATALOG_QUESTION_TOTAL`.
- **Regression test:** `tests/content-consistency.test.ts` — "no page types a package total by hand" and "no catalog headline surface types a question total by hand". The earlier check only banned restating the *correct* number, which is exactly why a wrong one slipped past it.

**P1-11 · Abandoned-order reminder endpoint failed open**
- **Severity:** P1 · **Affected feature:** Pending-payment reminders (sends real email)
- **Status:** FIXED
- **Root cause:** the authorization guard was written as "check only when a secret exists" (`if (cronSecret && ...)`). With `CRON_SECRET` / `ADMIN_SECRET` unset the whole check was skipped, so any visitor who found the URL could make the server send reminder email to every pending order.
- **Fix:** fail closed — no secret configured answers `503` with `Not configured`; a wrong or absent key answers `401`.
- **Regression test:** `tests/abandoned-reminders-auth.test.ts` (unconfigured, no header, wrong key, right key, `ADMIN_SECRET`).

**Re-verification:** `vitest` 58 files / 647 tests PASS · `tsc --noEmit` clean.

---

## Phase 4 — performance fixes (from PERFORMANCE_REPORT.md)

**P0-12 · The Neon driver was reaching the client bundle**
- **Severity:** P0 · **Affected feature:** `/simulasi`, `/riwayat`, `/simulasi/[id]` (every visitor, paid or not)
- **Status:** FIXED
- **Root cause:** `loadPackage.ts:2` imports `db.ts`, and `loadPackage.ts:161-162` re-exports `./tryoutCatalog`. The re-export keeps API code compiling but not bundling: any client component that imported catalog *data* from `@/lib/loadPackage` pulled the whole module graph in, so the 171.7 KB raw / 50.4 KB gz Neon + postgres + WebSocket chunk shipped to the browser.
- **Fix:** the four client-side files (`src/app/riwayat/page.tsx`, `src/app/simulasi/page.tsx`, `src/components/UpgradeProModal.tsx`, `src/components/TryoutContent.tsx`) import `TRYOUT_LIST` and friends from `@/lib/tryoutCatalog` directly. Server-only importers were left alone.
- **Evidence after the fix:** no chunk under `.next/static/chunks/` contains `NeonQueryFunction` or `api.neon.tech`; First Load JS `/simulasi` 232→**187 kB**, `/riwayat` 235→**190 kB**, `/simulasi/[id]` 246→**201 kB** (shared 159→158 kB).
- **Regression test:** `playwright-run-7.txt` — 90/90 pass on the new bundles.

**P0-13 · `/api/packages` served an identical public response with `no-store`**
- **Severity:** P0 · **Affected feature:** Tryout catalogue
- **Status:** FIXED
- **Root cause:** the route merges DB rows with `TRYOUT_LIST` and marked the answer `no-store, no-cache, must-revalidate, max-age=0`, so every visitor paid a cold render — TTFB measured at **1.94 s** (`PERFORMANCE_REPORT.md`).
- **Fix:** `public, s-maxage=300, stale-while-revalidate=1800`. The payload carries no user data; an admin's package edit becomes visible after at most 5 minutes.
- **Regression test:** **NOT RUN** — header change only; re-measure TTFB before closing.

---

## Phase 6 — personal progress snapshot (Feature 2)

**P3-16 · The /riwayat info banner promises browser storage that a guest never sees**
- **Severity:** P3 · **Affected feature:** `/riwayat` (guests only)
- **Status:** OPEN (product decision needed — not changed unilaterally)
- **Observed:** the banner states *"Riwayat pengerjaan soal disimpan di peramban ini."*, but `src/app/riwayat/page.tsx:110-114` deletes every `lolos_guest_exam_*` key and returns before the list is built, so a guest's history is empty on every visit — results written by `ExamSession` for a guest are never displayed anywhere.
- **Evidence:** `tests/e2e/progress-card.spec.ts` seeds three guest results, reloads `/riwayat`, and asserts the cards are gone and zero `lolos_guest_exam_result_*` keys remain. Before this was understood, the same seeding made the new progress card fail on all five viewports (`playwright-run-8.txt`, 5 failed / 95 passed).
- **Options (decide before changing):** keep the purge and soften the banner for guests, or keep the banner and stop purging so a guest can review on the same device until they clear it.
- **Regression test:** `tests/e2e/progress-card.spec.ts` (guest behaviour, 3 cases). Aggregation itself is pinned by `tests/progress-analytics.test.ts` (13 cases); the card rendered for a **logged-in** user is **NOT RUN** — it needs a signed `cpns_token`/`JWT_SECRET`, which the E2E server deliberately lacks.

---

## Phase 3 — content consistency (scanner-verified)

**P2-13 · Explanations missing or garbled in the package JSON**
- **Severity:** P2 · **Affected feature:** Answer explanations after submission
- **Status:** OPEN (quantified, not yet edited)
- **Evidence:** scan of `src/data/packages/*.json` — 37 files, 3.898 questions: **86 with no `explanation`**, **8 whose explanation contains raw LaTeX** instead of rendered math (`tryout-10.json:279`, `tryout-11.json:769`, `tryout-12.json:104`, …). Also **219 question texts repeat across packages** — intentional sharing is plausible, so that count is UNVERIFIED as a defect.
- **Reproduction:** `node scripts/_content_scan.mjs` (regenerate with the array-shape reader; see `docs/audit/CONTENT_CONSISTENCY.md` row 10).
- **Expected / Actual:** every question explains its answer / 94 do not or render literal LaTeX.
- **Regression test:** **NOT RUN** — a scanner test belongs with the content fix.
- **Note:** an earlier version of that scanner read the wrong JSON shape and walked 0 questions, producing a false OK. Retracted in `CONTENT_CONSISTENCY.md`.

**P2-14 · Prices are typed into JSX, ignoring `PRICE_TABLE` overrides**
- **Severity:** P2 · **Affected feature:** Upgrade CTAs, bundle modal, riwayat paywall
- **Status:** OPEN
- **Evidence:** literals `Rp 5.000` / `Rp 18.000` / `Rp 59.000` at `src/app/riwayat/page.tsx:624,630`, `src/app/simulasi/page.tsx:306-307`, `src/components/UpgradeProModal.tsx:376,400,424,537`, while `src/lib/pricing.ts:22-25` reads `KLIKQRIS_TRYOUT_PRICE` / `_BUNDLE_PRICE` / `_PRO_PRICE` from the environment.
- **Expected / Actual:** displayed price equals what the API charges / any env override desynchronises the UI from the checkout.
- **Regression test:** **NOT RUN** (requires rendering the surfaces with an overridden price).

**P2-15 · FAQ calls the 2027 passing grade "resmi" while the config says reference**
- **Severity:** P2 · **Affected feature:** Homepage FAQ
- **Status:** OPEN
- **Evidence:** `src/app/page.tsx:35` asks "Berapa passing grade **resmi** SKD CPNS 2027?" citing Kepmen PANRB 321/2024, while `src/lib/examRules.ts:41` sets `verification: 'reference'` for `EXAM_YEAR` and the profile UI renders "Acuan Passing Grade" (`src/app/profil/page.tsx:252`).
- **Expected / Actual:** labelling consistent with `verification` / the word "resmi" asserts an official 2027 rule that is not cited for 2027.
- **Regression test:** **NOT RUN** (copy-level; a content test would pin the phrase).


---

## P2-13 status update (2026-10-21)

The 8 LaTeX-garbled explanations are **FIXED**. Each was a plain-text copy with its LaTeX copy concatenated onto it, so the numbers ran together (`30×8.000=240.000` + `30 \times 8.000 = 240.000`). They were rewritten by hand from the figures in the intact LaTeX fragment — `scripts/_fix_latex.mjs` holds the exact replacements, nothing was invented, and totals the question never asked for were left out.

A first attempt fixed them mechanically (cut at the first backslash) and produced wrong numbers — `240.000` became `240.00030.`, and `6.000.000/400` lost its fraction bar. That change was reverted with `git checkout -- src/data/packages` before the hand-written version landed.

Evidence: `scripts/_content_scan.mjs` now reports **latexGarbled: 0** (was 8); `dupIds 0`, `emptyOptions 0`, `noMaxScore 0` unchanged; `tests/content-consistency.test.ts` 9/9 PASS.

Still OPEN in P2-13: the **86 missing explanations** (e.g. `tryout-18.json#68`). Those need real written content per question, not a repair — they are next, one batch at a time, each batch re-scanned.


---

## P2-13 second update — the 86 missing explanations (2026-10-21)

**27 written, 59 still open.** Scanner now reports **missingExplanation: 59** (was 86).

Written by hand and applied via `scripts/_apply_explanations.mjs` (writes only into empty `explanation` fields, never over an existing one — verified by the `skipped 0` count): the 26 TKP items of `tryout-18.json`/`tryout-19.json` plus the single TWK item `tryout-29.json#25`. Each explanation states why the marked answer is best and why the alternatives fail; nothing outside the question's own content. Drafts are kept as `docs/audit/explanations-batch-01..03.json`.

**The remaining 59 are all in `tryout-figural-2.json`, and they are image questions** — "Lengkapilah pola gambar di bawah ini.", options "Gambar A"…"Gambar E", answer is a picture. An explanation has to describe the visual pattern, and that cannot be derived from the JSON text alone, so these stay **OPEN** rather than being filled with reasoning nobody has checked. Closing them needs a visual pass over the figures (or an author's written pattern description per item).

`tests/content-consistency.test.ts` 9/9 PASS after the change. A sub-agent was dispatched to write all 86 and failed with a provider error after 47 minutes and zero bytes on disk — nothing partial to salvage.


---

## P2-13 third update — the 59 figural items are blocked on image analysis (2026-10-21)

All 59 remaining explanations live in `tryout-figural-2.json` and every one of them needs the figure read, not inferred. A sub-agent was dispatched to view the images and failed (HTTP 429, zero bytes written). The images themselves are present and ordinary — `public/images/questions/fig_tiu_03.png` is 87 KB — but image analysis is unavailable in this environment right now. Four attempts, all distinct failures:

1. local path `C:\...fig_tiu_03.png` — "Request timed out" (twice)
2. `file:///C:/...` — "media file not found"
3. `http://127.0.0.1:3100/...` from a local `next start` — "blocked: unsafe or private URL"
4. forward-slash path `C:/...` — "Request timed out"

**Status: OPEN, blocked.** Filling these explanations without seeing the figures would mean inventing patterns, which is exactly the failure mode this bug is about. The mapping is prepared and re-runnable: `scripts/_list_figural.mjs` writes `docs/audit/_figural.tsv` (index → image path → correctAnswer). When image analysis works, either a vision pass writes `docs/audit/explanations-figural.json` and `scripts/_apply_explanations.mjs` applies it, or the pattern descriptions are written by hand from the figures.

**P2-13 standing total: 8 fixed (LaTeX), 27 written (26 TKP + 1 TWK), 59 open (figural).** Scanner: `latexGarbled 0`, `missingExplanation 59`.


---

## P2-14 + P2-15 — typed prices and the "resmi" FAQ (status update, 2026-10-21)

**P2-14 — FIXED.** Root cause: amounts typed into JSX ("Rp 59.000", "Rp 3.600 per paket", "Hemat 28%... Rp 25.000") desynchronized from `pricing.ts` the moment an env override changed `PRICE_TABLE`. Fix, in three layers:

- `src/app/api/pricing/route.ts` (new): serves the same `PRICE_TABLE`/`BUNDLE_SIZE` `create-order` charges from, formatted `Rp` labels incl. `singleOfBundle = single × bundleSize` (= 25.000), cacheable `s-maxage=300, swr=1800` (user-agnostic, like `/api/packages`).
- `src/lib/usePrices.ts` (new): `usePrices()` hook (defaults before fetch answers; error → keep defaults) and `priceBreakdown(prices)` that derives `perPaket` and the "Hemat N%" from the live numbers instead of a typed constant.
- All seven typed sites now read the hook: `UpgradeProModal.tsx` (4 amounts + derived per-paket/interin line), `riwayat/page.tsx` (2), `simulasi/page.tsx` (2, incl. banner). `grep 'Rp 5.000|18.000|59.000|3.600|25.000|Hemat 28'` over `src/app` + `src/components` → zero matches.

Verified: `tests/pricing-route.test.ts` 4/4 (default table, env-follow test, non-numeric override fallback, cache header); `tsc --noEmit` 0; full gates in run 19.

**P2-15 — FIXED.** `src/app/page.tsx` FAQ question said "passing grade **resmi** SKD CPNS 2027" while `examRules.ts` verifies the 65/80/166 figures as `Kepmen PANRB 321/2024` — a regulation reference, not a per-period BKN announcement. Question rephrased to "passing grade SKD CPNS 2027", and the answer now states the figure's basis and explicitly separates regulation reference from season announcement. JSON-LD `faqJsonLd` inherits the fix automatically (same array).


---

## P2-14 + P2-15 — status: DONE (supersedes the partial note above, 2026-10-21)

**P2-14 — FIXED (all seven sites + two derived constants).** The amounts are no longer typed anywhere; everything renders from `usePrices()`/`priceBreakdown(prices)`, which read `GET /api/pricing` — the same `PRICE_TABLE`/`BUNDLE_SIZE` that `create-order` charges from.

- `UpgradeProModal.tsx`: 3 tier labels (`labels.single`/`labels.bundle`/`labels.pro`), per-paket line (`breakdown.perPaket`), the small `HEMAT {breakdown.hematPct}%` badge (was a typed `HEMAT 28%`, caught by `/HEMAT \d+%/` only after the test stopped asserting the typed number), and the bottom "Hemat {hematPct}% ... ({labels.singleOfBundle})" row.
- `riwayat/page.tsx`: PRO CTA + "Beli Paket Satuan Mulai {labels.single}".
- `simulasi/page.tsx`: banner CTA `Upgrade PRO — {prices.labels.pro}` + secondary label.
- Guard: full-repo grep for `Rp 1[0-9]…|Rp 59|Rp 5.000|Rp 3.600|Hemat 28|HEMAT 28` over `src/app` + `src/components` → **zero matches**.

Tests updated to guard the new contract (they previously asserted the typed literals — the very defect): `tests/bundle-order.test.ts` ("offers three tiers" now asserts `usePrices()` + label bindings; "states the bundle saving" asserts `priceBreakdown`/`breakdown.hematPct` and `not.toMatch(/HEMAT \d+%/)`), `tests/pricing.test.ts` (banner CTA must match `prices.labels.pro`, `not.toMatch(/Rp \d/)`). New `tests/copy-claims.test.ts` (4) guards the copy side of both findings.

**Bundle movement after the hook (run 19 build log `build-log-usePrices.txt`):** `/simulasi` 187→188 kB, `/simulasi/[id]` 201→202 kB, `/riwayat` 191 kB, `/simulasi/hasil` 187 kB, First Load shared 158 kB (unchanged). The ~1 kB is the `usePrices` hook + fetch wiring; acceptable, and the price list route itself adds 0 B to pages (`/api/pricing` 0 B).

**P2-15 — FIXED.** Remaining "resmi" copy asserting an unannounced year was reframed to the reference frame `examRules.ts` already declares (`verification: 'reference'`):
- FAQ Q1: "passing grade resmi SKD CPNS 2027" → "passing grade SKD CPNS 2027"; answer now cites Kepmen 321/2024 as the package basis and explicitly separates it from a per-period BKN announcement.
- FAQ Q3: "sistem CAT BKN resmi" → "sistem CAT BKN (acuan penyelenggaraan BKN)".
- `/simulasi` description: "standar resmi BKN" → "standar acuan BKN". `TryoutContent.tsx`: "pembagian waktu resmi CAT BKN" → "pembagian waktu acuan CAT BKN".
- Kept: Footer's disclaimer (it correctly says the site is *not* official) and the order-flow comments ("uniqueCode resmi dari KlikQRIS") — those are about real mechanisms, not unconfirmed exam figures.

**Gates (run 19):** vitest full suite green up to the FA4 statistics change, build `BUILD=0`, E2E **115 passed (54.3s)** → `docs/audit/playwright-run-19.txt`. Focused: `pricing.test.ts` + `bundle-order.test.ts` + `pricing-route.test.ts` + `copy-claims.test.ts` = **50 passed**.


---

## P2-11 — status: DONE (2026-10-21)

**Finding confirmed by simulation.** 007/008/009/011 are all `ALTER TABLE payment_orders ...` and no earlier file has a `CREATE TABLE`; `admin/migrate` (checked by grep) creates users/packages/questions/exam_results/password_resets **but never payment_orders**. A fresh environment therefore fails at 007 with `ERROR: relation "payment_orders" does not exist` — the whole additive chain dead-ends before any payment feature can run.

**Fix: `migrations/012_create_payment_orders.sql`** — a placeable-before-007 `CREATE TABLE IF NOT EXISTS` (idempotent, so the prod DB where the table already exists is unharmed) carrying the union of every column the code touches, i.e. 17 columns:

`id BIGSERIAL PK · user_id UUID → users(id) ON DELETE CASCADE · user_email · package_id · order_type · base_amount BIGINT · unique_code INT · exact_amount BIGINT · status (default 'pending') · package_ids jsonb · signature · qris_url · qris_image · last_reminded_at · expires_at · paid_at · created_at`

Two real corrections found while building it:

1. **`user_id` is UUID, not INTEGER.** First draft used `INTEGER`, and applying the chain against Postgres 16 failed with `Key columns "user_id" and "id" are of incompatible types: integer and uuid` — `users.id` is `uuid DEFAULT gen_random_uuid()` (verified via `\d users`). Everyone got type-true, every payment path (`payload.userId` from the JWT) agrees.
2. **`expires_at` stays nullable on purpose** — nothing in `src/` ever writes a future `expires_at` (only `cancel` sets it to `NOW()`, and reading `history` treats NULL as still-pending pending-webhook): KlikQRIS's own EXPIRED webhook delivery owns the pending→expired transition; a schema default would invent an expiry the gateway never announced.

Indexes match the three real access patterns: `idx_payment_orders_user_pending (user_id, order_type, status, created_at DESC)` for the create-order dedupe read, `idx_payment_orders_pending_created (status, created_at) WHERE status='pending'` for the abandoned-reminders cron, PK for the webhook id lookup.

**Verification:**
- Full chain `001 → 002 → 003 → 004 → 012 → 007 → 008 → 009 → 010 → 011` applied against a **fresh Postgres 16 container**: `ALL_MIGRATIONS_APPLY_CLEAN`, `\d payment_orders` exactly the 17 columns above, and an INSERT + SELECT round-trip succeeded.
- The additive ALTERs (007/008/011) then applied idempotently over it (`ADD COLUMN IF NOT EXISTS` — NOTICE-skipped, PROD-safe).
- `tests/p2-11-schema.test.ts` (4 vitest) guards: CREATE exists in the chain, all 16 data columns present, both access-pattern indexes named, `expires_at` remains without DEFAULT.
- Lint/build/E2E: build 0, tsc 0, vitest **64 files / 678 passed**, E2E (run 21) in flight.

**Remaining nuance (documented, not a defect):** a fresh pending order has `expires_at = NULL`, so the create-order dedupe ("pending AND expires_at > NOW()") never matches new rows — that means duplicates can only be prevented by the gateway-collision delete-retry loop, not the SELECT. This is pre-existing behaviour in `create-order:110-137`; noted for a future P3 since it is not a data-loss or money bug (payment still goes through a single active QRIS via KlikQRIS collision handling).
