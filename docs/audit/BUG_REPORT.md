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

---

## P1-10 — Cancel raced a settling payment and could unpick a paid order (2026-10-21)

- **Severity:** P1
- **Affected feature:** Order cancellation, billing history, entitlement
- **Status:** FIXED
- **Root cause:** `src/app/api/payment/cancel/route.ts` read the order, checked `status === 'pending'`, then wrote `UPDATE payment_orders SET status='cancelled', expires_at=NOW()` with **no status predicate**. The pre-check is not atomic with the write, so a PAID webhook (or the sync poller) landing in that window was overwritten: a paid order became `cancelled`. Two consequences — the billing history denied a payment the learner had actually made, and `expires_at = NOW()` freed the unique code while the money was already taken. This is the same class as P1-7 (unguarded status write), which is why the webhook's other two branches already carried the guard and this one did not.
- **Fix:** the write is guarded on `AND status = 'pending' RETURNING id`, matching the webhook transitions. A guard that matches no row means the payment won the race, and the route answers **409** `"Pesanan sudah diproses dan tidak dapat dibatalkan."` instead of a false success. The guard makes settle-or-cancel depend on one atomic statement rather than on the order of two round-trips.
- **Regression test:** `tests/entitlement-lifetime.test.ts` — "writes the cancel with a status guard so it cannot overwrite a paid row" (asserts the predicate is in the statement) and "reports a conflict instead of a false success when the guard matches nothing" (asserts 409). Mutation-checked: removing only the guard fails those two and nothing else.
- **Remaining risk:** the entitlement grant is unaffected by a lost cancel (it was never written on the cancel path), so no access is lost — this was a record-integrity defect, not a paywall bypass.

---

## Entitlement expiry after purchase — CLOSED (2026-10-21)

The audit carried this as "no expiry-of-entitlement-after-purchase test exists", which assumed the product had a time-limited entitlement. It does not: `src/components/UpgradeProModal.tsx:531` sells "Akses aktif selamanya sampai kamu lulus CPNS", and `src/app/api/user/status` returns `is_pro` with no date comparison anywhere. There is no expiry to test, so the item is restated as its real risk — **can a granted entitlement be revoked by a later move of the order?** — and closed by `tests/entitlement-lifetime.test.ts` (15 cases):

- EXPIRED replayed after PAID leaves access granted and history untouched (P1-7's guarantee, now pinned from the lifetime side too);
- a duplicate PAID delivery grants nothing extra;
- a paid order cannot be cancelled (400), and a cancel that loses the race answers 409 (P1-10);
- the sync poller reports `paid` without re-granting when the webhook already settled the order;
- exactly-once grant holds on both payment paths, including the losing side of each transition;
- an unknown `order_type` never falls through to PRO on either path;
- unlocks are additive (a second purchase keeps the first) and idempotent (no duplicate ids), and a single-package grant never downgrades PRO.

If a time-limited PRO tier is ever introduced, this suite is the place to add the boundary cases (exactly-at-expiry, clock skew) — the current code has no such boundary to test.

---

## P2-11 addendum — production column set verified against migration 012 (2026-10-21)

The production `payment_orders` column set was verified read-only against `migrations/012_create_payment_orders.sql` on **2026-10-21**. **Verdict: MISMATCH** — the migration does not describe the production table. Full method, side-by-side tables and per-discrepancy blast radius: [`docs/audit/MIGRATION_012_VERIFICATION.md`](./MIGRATION_012_VERIFICATION.md).

Headline corrections to the record above, none of which change the fix's usefulness but all of which change what it may be claimed to be:

- **012 is not a no-op on production.** `CREATE TABLE IF NOT EXISTS` is skipped, but both `CREATE INDEX IF NOT EXISTS` statements and the `COMMENT ON TABLE` **do** execute, because neither index exists and the table has no comment. The mutation is benign (two indexes `PERFORMANCE_REPORT.md` M27 asks for, on a 91-row table) but it is DDL, not a no-op.
- **The column sets do not agree.** 17 claimed / 17 actual, but only 5 match exactly. `last_reminded_at` exists **only** in the migration; `saweria_donation_id` exists **only** in production (47 rows have a NULL `user_id`, all legacy Saweria rows). Types differ on `id` (integer, not BIGSERIAL), `base_amount`/`exact_amount` (integer, not BIGINT), and four `varchar(n)` vs `TEXT` columns. Nullability differs on `user_id`, `order_type`, `unique_code`, `status`, `created_at`.
- **`last_reminded_at` is a live production bug, not just drift.** The column does not exist anywhere in the database, so `POST /api/payment/abandoned-reminders` fails with `column "last_reminded_at" does not exist` on every invocation. Abandoned-cart reminders have never run in production.
- **`expires_at` does have a production default** — `now() + interval '3 hours'` — contradicting the "no default on purpose" rationale recorded above. Production's `create-order` dedupe (`expires_at > NOW()`) works precisely because of that default; a fresh provision built from 012 would insert NULL and the dedupe branch could never match.
- **The FK has no `ON DELETE CASCADE`** in production (`confdeltype = 'a'`, NO ACTION), and **both access-pattern indexes are absent** from production; `idx_payment_orders_amount (exact_amount, status)` exists there and in no migration file.

Read-only throughout: no DDL, no `INSERT`/`UPDATE`/`DELETE` against production. The temporary Vercel env file was written outside the repo and deleted after use.

---

## P3-16 — guest banner FIXED; repeatedText 219 triaged (2026-10-21)

### P3-16 · FIXED — the guest banner no longer promises storage the page deletes

**Product decision taken:** keep the purge (deliberate privacy behaviour on a shared device), soften the banner for guests only. A signed-in user's sentence is untouched because for them it is true.

**Root cause, confirmed at the line level:** `loadExamData()` returns early for `!userId` after `guestKeys.forEach(k => localStorage.removeItem(k))` (`src/app/riwayat/page.tsx:114-126`), so `history` is always `[]` for a guest. The banner text was an unconditional JSX text node after the icon, outside that branch.

**The change** (`src/app/riwayat/page.tsx`): one derived constant beside the existing `filteredTransactions`, keyed on the same `userId` the purge reads (no second source of truth), and the banner renders `{storageNotice}` instead of a literal.

| state | before | after |
|---|---|---|
| signed in | `Riwayat pengerjaan soal disimpan di peramban ini.` | `Riwayat pengerjaan soal disimpan di peramban ini.` (unchanged) |
| guest | `Riwayat pengerjaan soal disimpan di peramban ini.` | `Sebagai tamu, hasil tryout tidak masuk riwayat dan hanya tersimpan selama tab ini terbuka. Masuk agar riwayat tersimpan.` |

The guest sentence is specific rather than vague: `ExamSession.tsx:459-470` writes a guest result to **sessionStorage** (`guest_exam_result_*`) and `/simulasi/hasil/[resultId]` reads it back, so "only while this tab is open" is literally true, while "not saved to history" is what the purge enforces. The sign-in affordance already exists on this page — `GuestLimitModal` opens automatically for a guest (`page.tsx:88-92`), and the billing tab has its own "Masuk Sekarang" — so the copy points at it in words instead of adding a third control.

**Regression test:** `tests/copy-claims.test.ts`, new `describe('P3-16 …')` with 4 cases (file 4 → 8 tests). Chosen over the Playwright spec because the defect was the copy itself, and `tests/e2e/progress-card.spec.ts` already pins the purge behaviourally. The cases assert (1) the purge still exists and still returns before the list is built, (2) the banner renders `{storageNotice}` and the old literal no longer sits after the icon, (3) the signed-in sentence is byte-identical, (4) the guest sentence says "tidak masuk riwayat", names the tab lifetime, points at "Masuk", and does **not** contain "disimpan di peramban ini".

**Mutation proof:** restoring the old literal (deleting `storageNotice`) fails 3 of 8 —
`renders the banner copy from the userId branch…`, `leaves the signed-in sentence exactly as it was`, `tells a guest the result is not saved to history…` — and all 8 pass again on restore.

**Gates:** `unset NODE_ENV && npx tsc --noEmit` → exit 0. `npx vitest run tests/copy-claims.test.ts` → 8/8. Full suite → **64 files / 696 tests passed** (baseline 692 + these 4; nothing else moved).

---

### repeatedText: 219 — CLOSED as "not the defect the number implies", with two real defects split out

`node scripts/_content_scan.mjs` still reports `repeatedText: 219` over 37 packages / 3.898 questions (3.679 distinct stems). Every one of the 219 repeat events was classified directly from the JSON by a throwaway script kept in `$TMPDIR` (nothing added to the repo). The decomposition sums exactly to 219:

| bucket | events | what it is |
|---|---|---|
| intra-paper figural instruction, distinct image per item | 114 | `"Lengkapilah pola gambar di bawah ini."` ×14, `"Tentukan satu gambar yang tidak mempunyai persamaan…"` ×20, etc. The payload is the picture: all 10 such stems (124 questions) carry a **distinct** image per item, 0 reused. |
| cross-package exact duplicate | 54 | same stem + same options + same key in two papers. `tryout-19 ↔ tryout-23` (29) and `tryout-mini` reusing items from `tryout-2/3/4/5/6` (25). |
| intra-paper exact duplicate | 43 | the same complete item twice **inside one paper** — see P3-17. |
| cross-package same key, options reordered/reworded | 6 | e.g. `NISBI >< ...` in four papers, all keying "Mutlak"; `PROGRESIF >< ...`, `SPORADIS >< ...`. Benign. |
| cross-package different options **and** different key | 2 | `AFIRMASI =` and `Pilihlah kata yang tidak termasuk dalam kelompoknya!` — both legitimate, see below. |

**Answer-key contradictions found by the text scan: zero.** No stem in the corpus shares the same option set with a different key. The two "different key" stems are generic instructions whose payload is their option list, and each key is correct for its own options:
- `AFIRMASI =` — `tryout-3.json#41` key "Penegasan" (KBBI: *penetapan yang positif; penegasan*), `tryout-30.json#35` key "Konfirmasi" (also a listed synonym). Neither paper offers the other's key text as an option, so no learner can be marked wrong for a right answer.
- `Pilihlah kata yang tidak termasuk dalam kelompoknya!` — `tryout-28.json#55` (office roles → "Pedagang") vs `tryout-31.json#42` (office supplies → "Ponsel"). Different option lists, different keys, both correct.

**Options and answer agree on every exact duplicate.** All 43 intra-paper pairs and 54 cross-package groups were compared down to `[option.id, option.text, option.score]` + key + explanation + image: **43/43 intra pairs fully identical, 0 differing in options or scores.**

**Verdict: (c) mixed, but not in the way the count suggests.** The 219 is dominated by benign reuse (114 figural + 54 cross-package + 6 reorder = 174). Two real defects came out of the investigation, and neither is "shared questions are bad":

#### P3-17 (new, OPEN) · Four packages deliver the same item twice in one sitting

The same complete item appears twice inside one paper — same stem, same options, same scores, same key, same explanation. A learner pays for a 110-item paper and gets fewer distinct items:

| package | duplicated items | of 110 | categories |
|---|---|---|---|
| `tryout-23.json` | 12 | 11% | TKP 12 |
| `tryout-24.json` | 16 | 15% | TIU 8, TKP 8 |
| `tryout-25.json` | 10 | 9% | TWK 2, TIU 3, TKP 5 |
| `tryout-32.json` | 5 | 5% | TIU 4, TKP 1 |

Full pair list — `tryout-23`: `#66=#71 #67=#85 #72=#108 #73=#74 #78=#82 #79=#110 #83=#96 #84=#87 #88=#106 #89=#97 #99=#100 #104=#105`; `tryout-24`: `#33=#44 #34=#45 #35=#57 #36=#61 #37=#60 #40=#54 #46=#53 #52=#64 #71=#110 #74=#105 #79=#98 #80=#84 #93=#108 #95=#107 #99=#101 #102=#109`; `tryout-25`: `#4=#26 #21=#27 #35=#57 #42=#61 #50=#51 #67=#110 #71=#101 #78=#106 #81=#87 #92=#109`; `tryout-32`: `#32=#58 #35=#48 #42=#53 #45=#59 #97=#110`.

**Why it matters beyond variety:** 26 of the 43 are TKP, which is scored by the chosen option's weight. A duplicated TKP item is a second 5-point opportunity the paper did not intend, so the achievable TKP total is inflated against a 45-item section (max 225). TIU/TWK duplicates inflate nothing but waste an item slot.

**Not fixed here, deliberately.** Fixing it means writing 43 replacement items — authoring work, not a mechanical edit. Deleting the duplicates would drop each paper below the 110-item SKD composition (30 TWK / 35 TIU / 45 TKP), which would break the scoring normalisation in `src/lib/scoring.ts:38-42` (`totalQ === standardTotal` decides whether the standard max/passing grade applies). The scanner already reports these, but buries them inside `repeatedText` alongside the 114 benign figural stems, which is why the raw 219 looked alarming.

#### P3-18 (new, OPEN) · The same figure is keyed differently in different packages

The text scanner cannot see this: the stems differ (they carry different "No. N" labels), so these never reach `repeatedText`. Comparing `image` by SHA-1 across the corpus, **13 image values are used by more than one question; 5 of those are answered with a different key.** Since the option lists are identical five-way `Gambar A…E` panels, a conflicting key on the same figure means one of the two papers marks the same picture wrong:

| figure | question A | question B (and C) |
|---|---|---|
| `57b59c6ff2` (inline PNG) | `tryout-12.json#57` → **Gambar A** | `tryout-13.json#58` → **Gambar B** |
| `7cf628587c` (inline PNG) | `tryout-12.json#64` → **Gambar E** | `tryout-9.json#59` → **Gambar D** |
| `c11a089a90` (inline PNG) | `tryout-13.json#59` → **Gambar E** | `tryout-15.json#54` → **Gambar B**; `tryout-8.json#59` → **Gambar C** |
| `c9610e0419` (inline PNG) | `tryout-16.json#61` → **Gambar D** | `tryout-9.json#57` → **Gambar B** |
| `a4c407c834` (`/images/questions/fig_serial_05.png`) | `tryout-figural.json#36` → **Gambar B** | `tryout-mini.json#19` → **Gambar A** |

The remaining 8 reused images agree on the key, so reuse itself is fine — only these 5 are contradictions. Note the shape of the strongest evidence: `tryout-12#64` and `tryout-9#59` share the identical stem pattern *and* the identical 288 KB figure, yet key "Gambar E" vs "Gambar D". Same for `c11a089a90`, which is keyed E, B and C across three papers. One of each set is wrong, and resolving it needs the figure looked at — exactly the blocker already recorded for P2-13's 59 figural explanations, so this is filed OPEN rather than guessed at.

**Severity P2** — a learner who practises both papers is told two different answers for the same picture, which is the "contradictory keys" failure the repeatedText question was asking about, just not reachable through `text`.

**Standing totals:** `dupIds 0`, `emptyOptions 0`, `noMaxScore 0`, `latexGarbled 0`, `missingExplanation 59` (unchanged, figural, blocked on image analysis), `repeatedText 219` (now explained: 174 benign + 43 P3-17 + 2 benign generic).

---

## P1-11 — The exam nav row overflowed a 320px screen and made the retry unreachable (2026-10-21)

- **Severity:** P1 (on the smallest supported phone, a failed submission could not be retried)
- **Affected feature:** Exam session nav, failed-submission recovery
- **Status:** FIXED
- **Found by:** writing the P1-3 browser regression test (see Run 23 in `docs/testing/TEST_RESULTS.md`).
- **Root cause:** the nav row holds three `shrink-0`-ish items — "Sebelumnya", the mobile quick-jump button, and "Selanjutnya". At a 320px viewport their combined width exceeded the screen, so the document scrolled to **348px**. Because the failure banner is `position: fixed`, its bottom then sat below the visual viewport: the "Coba Kirim Ulang" button was **5.5px on screen** and a centre click was intercepted by the error paragraph underneath. The retry therefore existed in the DOM and was unreachable in practice.
- **Fix:** `src/app/simulasi/[id]/ExamSession.tsx` — the two nav labels are visually hidden below 360px with `sr-only min-[360px]:not-sr-only`, the quick-jump button gets `min-w-0` + `truncate` so it can actually shrink, and its icon gets `shrink-0`. `sr-only` rather than `hidden` on purpose: `hidden` removes the label from the accessibility tree, which turns both buttons into unlabelled icon-only controls. A first attempt used `hidden` and the full suite caught it — `cat-tryout.spec.ts` locates these buttons by accessible name and failed 3 cases on mobile-320 (157 passed / 3 failed). With `sr-only` the full suite is **160/160**.
- **Second, independent cause:** with the nav fixed the page still measured 342px. The `<dl className="grid grid-cols-3">` stats row in `src/components/TryoutContent.tsx` gives each card ~96px at 320px, narrower than the label's own min-content width, pushing the document wide. Fixed with `grid-cols-2 min-[380px]:grid-cols-3` plus `overflow-x-hidden` on the article.
- **Regression test:** `tests/e2e/exam-resilience.spec.ts` → "the paper never overflows the viewport horizontally", which asserts `scrollWidth <= clientWidth + 1` and that the nav row's box sits inside the viewport. Mutation-checked: reverting both fixes fails it at mobile-320 with `scrollWidth 342 > 321`, and nothing else.

---

## P1-3 / P1-4 / P1-5 — regression tests no longer NOT RUN (2026-10-21)

All three were already FIXED; what was missing was browser-level proof. `tests/e2e/exam-resilience.spec.ts` (9 cases × 5 viewports = 45, all passing, `docs/audit/playwright-run-23.txt`) now covers:

- **P1-3** — a failed `POST /api/results` keeps every draft key and the retry then succeeds and only then clears them; the confirm dialog cannot be dismissed mid-flight; a 403 at submit keeps the paper and reports lost access; the time-up path (no dialog) shows the retryable banner on the paper and leaves the start timestamp untouched.
- **P1-4** — a delayed `/api/auth/me` never lets the guest scope write storage; a guest draft survives the delayed resolution with answers and start timestamp intact.
- **P1-5** — the submitted `durationSeconds` reports the package's own duration past the old 6000-second cap and never exceeds what the package allows.

**Honest limit:** P1-4's exact pre-fix failure mode (an account draft displacing the guest paper) cannot be reproduced deterministically without a signed session, which the E2E server deliberately lacks. The case pins the observable half — that the guest draft is untouched across a late auth resolution — rather than claiming to reproduce the swap.

---

## P1-12 — 21 TKP items carry duplicate weights and are silently re-ranked at load (2026-10-21)

- **Severity:** P1 (a TKP answer's point value differs from what the package JSON says)
- **Affected feature:** TKP scoring, every package containing one of these items
- **Status:** OPEN — found, verified, not fixed (fixing needs an authored weight per item, see below)
- **Found by:** the master audit (`docs/qa-master-audit-final.md` §7.1), then verified independently here by direct scan.
- **Root cause:** TKP items are supposed to score 1–5 across their five options, i.e. a permutation of `1,2,3,4,5`. Twenty-one items ship **duplicate** weights instead — e.g. `[4,5,2,1,4]`, `[4,3,2,5,4]`, `[1,2,5,1,3]`. `normalizeQuestionScores` (`src/lib/loadPackage.ts:5-24`) detects any non-clean ladder and **deterministically re-ranks** the options to 1..5 by sorting their relative order. The learner is therefore scored against weights the package never declares, and the served score differs from the JSON score for those items.
- **Verified count and location** (`node` scan of `src/data/packages/*.json`, reproducible): exactly **21**, in `tryout-22` (3), `tryout-27` (3), `tryout-28` (1), `tryout-29` (1), `tryout-30` (3), `tryout-31` (3), `tryout-33` (5), `tryout-34` (2). Full list: `tryout-22#75,82,98`, `tryout-27#73,94,96`, `tryout-28#77`, `tryout-29#79`, `tryout-30#96,100,105`, `tryout-31#81,84,99`, `tryout-33#75,96,103,105,107`, `tryout-34#87,110`.
- **Why it is not fixed here:** a correct fix is a judgement about each item's intended weight ladder, which is content authoring, not a mechanical repair. Re-ranking is arguably the least-bad runtime behaviour (it keeps the item scorable and preserves relative order); the defect is that the JSON is wrong and nothing surfaces it.
- **Cheapest safe next step:** a scanner assertion that fails on any non-permutation TKP ladder, so the 21 cannot grow while they are being rewritten. Not added yet — it would fail the suite immediately until the content is fixed.
- **Note:** `normalizeQuestionScores` is also the reason these items do not produce a crash or a NaN. Removing it without fixing the content would be worse.

