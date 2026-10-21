# TEST RESULTS — Lolosin.com

Every status below was produced by a command that ran in this repository on
2026-10-21. Nothing is recorded as PASS unless the command printed it. Logs
named here live next to this file in `docs/audit/`.

---

## 1. Unit and integration (Vitest)

Log: `docs/audit/vitest-current.txt`, `docs/audit/tsc.log`

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `npx vitest run` | **PASS** — 56 files, 635 tests, 0 failed |

Note: these were run with a clean environment. With `NODE_ENV=production`
exported, 7 auth tests fail by design — `src/lib/auth.ts` refuses to sign or
verify a JWT when `JWT_SECRET` is absent, so `/api/auth/login` answers 500.
That is the intended fail-closed behaviour, not a regression; unset
`NODE_ENV` before running the suite locally.

Test files were grown during this audit. Suites added here: entitlement gate,
exam clock, exam rules/catalog content consistency, payment grant integrity,
streak time-zone handling, auth session probe.

## 2. Production build

Log: `docs/audit/build-log-current-tree.txt`

`npx next build` — compiled successfully against the tree under test; the E2E
suite runs against that build, not against `next dev`.

## 3. Browser E2E (Playwright)

Run 1 — `docs/audit/playwright-run-1.txt`
- First full run of `tests/e2e/homepage.spec.ts` at 1440/1280/768/390/320.
- Triage, not counted as a result: every guest page logged a console error from
  `/api/auth/me` (401 on "no session"), and the header row overflowed the
  viewport at 768 px. Both were fixed before any PASS was claimed.

Run 2 — `docs/audit/playwright-run-2.txt`
- `tests/e2e/homepage.spec.ts` across all five viewports.
- Console and HTTP error listeners clean; no horizontal overflow; every internal
  link on the homepage answered < 400; back/forward restored the page; keyboard
  focus visible; off-screen content reachable.

Run 3 — `docs/audit/playwright-run-3.txt`
- `homepage.spec.ts` plus the first cut of `tests/e2e/cat-tryout.spec.ts`.
- **FAIL — 77 passed, 13 failed.** Two spec defects, both found by reading the
  failure output rather than by relaxing the assertions: a locator aimed at a
  hidden duplicate of the question counter, and a submit assertion that would
  have accepted any navigation away from the paper.

Run 4 — `docs/audit/playwright-run-4.txt`
- **FAIL — 88 passed, 2 failed.** One stale assertion left over from run 3
  (`getByRole('button', { name: /1\/110/ })`) matched no element on desktop.
  Removed, not weakened.

Run 5 — `docs/audit/playwright-run-5.txt`
- **PASS — 90 / 90** (18 tests × 5 viewports: 1440, 1280, 768, 390, 320),
  39.8 s, exit code 0. This is the run recorded as the current result.

## 4. What the CAT suite covers today

`tests/e2e/cat-tryout.spec.ts`, against a production build with no database
behind it (`getDb() === null`):

- a paper opens with a running countdown and the catalog's own section split
  (TWK 1–30, TIU 31–65, TKP 66–110);
- an answer is recorded in `localStorage` with its question id and option id;
- answers survive next/previous, palette jumps, and a full reload;
- a second answer does not displace the first;
- submitting reaches the scorer and reports a result whose passing grades are
  TWK 65 / TIU 80 / TKP 166 and whose answered counts match what was actually
  answered — read back out of the live API response, not assumed;
- a guest is refused a premium paper by the server (HTTP 403), not by a hidden
  button — with no database behind the gate, which is the fail-closed case;
- the first-visit mode dialog is offered once and its choice is remembered.

## 5. Deliberately NOT RUN

| Item | Why |
|---|---|
| Real payment transactions | Prohibited by design; payments stay mocked in Vitest. |
| End-to-end against the production database | E2E writes rows; the suite runs with the database switched off instead. |
| Entitlement expiry after purchase | No test exists yet; tracked in `docs/audit/BUG_REPORT.md`. |
| Screen-reader announcement of the exam timer | The visual timer is asserted; its accessible name is not. |
| Lighthouse / LCP / CLS | Not measured with a tool this session — see `docs/audit/PERFORMANCE_REPORT.md`. |


---

## Run 9 — personal progress snapshot (2026-10-21)

Tree: P0-12 (Neon out of the client bundle), P0-13 (`/api/packages` cacheable), `src/lib/progressAnalytics.ts`, `src/components/ProgressSnapshotCard.tsx`, card mounted on `/riwayat`.

| Gate | Result |
| --- | --- |
| `tsc --noEmit` | **PASS** (exit 0) |
| `vitest` | **PASS** — 59 files / 660 tests |
| `next build` | **PASS** — BUILD=0 |
| `playwright` run 9 | **PASS** — **105 passed / 0 failed**, 58.3s (`docs/audit/playwright-run-9.txt`) |

Measured bundle movement from P0-12: `/simulasi` 232→187 kB, `/riwayat` 235→191 kB, `/simulasi/[id]` 246→201 kB; no chunk under `.next/static/chunks/` contains `NeonQueryFunction` or `api.neon.tech`.

NOT RUN in this pass: progress card rendered for a logged-in user (needs a signed `cpns_token`/`JWT_SECRET`, absent by design in the E2E server); `/api/packages` TTFB re-measurement after the cache-header change. Known failing-then-corrected: run 8 was **5 failed / 95 passed** because the new spec seeded guest results, which `src/app/riwayat/page.tsx:110-114` purges — see BUG_REPORT P3-16.


---

## Run 10 — daily mission (2026-10-21)

Tree: `src/lib/dailyMission.ts`, `src/components/DailyMissionCard.tsx`, card mounted on `/journey` reading the page's own `streakDates`.

| Gate | Result |
| --- | --- |
| `tsc --noEmit` | **PASS** (exit 0) |
| `vitest` | **PASS** — 60 files / 665 tests |
| `next build` | **PASS** — BUILD=0 |
| `playwright` run 10 | **PASS** — **105 passed / 0 failed**, 60.0s (`docs/audit/playwright-run-10.txt`) |

NOT RUN in this pass: the mission card itself rendered in a browser — run 10 covers the pre-existing suite only. Card visibility and its `aria-valuenow` are covered by `tests/e2e/daily-mission.spec.ts` (2 cases), whose result lands in run 11.


---

## Run 15 — daily mission card in a browser (2026-10-21)

| Gate | Result |
| --- | --- |
| `playwright` daily-mission spec | **PASS** — **10 passed / 0 failed**, 8.6s (`docs/audit/playwright-run-15.txt`) |

Runs 11, 12 and 14 failed on the same second case and are kept as evidence: run 11/12 because the spec seeded the unscoped `journey_streak_dates` key, which nothing reads (`getScopedJSON` prefixes `lolos_guest_`), and because `src/app/journey/page.tsx:78-84` clears all journey state when there is no session. Run 14 failed with "No tests found" after an invalid assertion in the spec itself. The passing case pins the guest behaviour; the met-mission branch stays covered by `tests/daily-mission.test.ts` and is NOT RUN in a browser (needs `JWT_SECRET`).

### Run 19 — usePrices(): prices from one server table (P2-14) + reference-frame copy (P2-15)

- Scope: new `GET /api/pricing` (PRICE_TABLE + `Rp` labels, `s-maxage=300, swr=1800`), new `src/lib/usePrices.ts` (`usePrices()`, `priceBreakdown()`), all seven typed JSX price sites switched; FAQ/SEO "resmi" copy reframed to the `verification: 'reference'` frame.
- tsc: PASS (0 errors, after deleting the stale `.next/types` include errors TS6053).
- vitest: PASS — pricing-route 4/4; after test contract updates: bundle-order + pricing + copy-claims = 50/50.
- build: PASS (`BUILD=0`, `build-log-usePrices.txt`). `/api/pricing` 0 B; `/simulasi` 188 kB (+1), `/simulasi/[id]` 202 kB (+1), `/riwayat` 191 kB; First Load 158 kB unchanged.
- Playwright (run 19, `playwright-run-19.txt`): **115 passed (54.3s)**, 0 failed.
- NOT RUN: TTFB of `/api/packages` after cache change (carried over); logged-in price-render check (E2E guest pages never show the paid tier).

### Run 20 — final state for P2-14 + P2-15 (all edits in)

- tsc: PASS (0).
- vitest: PASS — **673 passed / 0 failed** (61 files; includes 4 new pricing-route, 4 new copy-claims guard, updated bundle-order + pricing contracts).
- build: PASS (`BUILD=0`, `build-log-run20.txt`).
- Playwright (run 20, `playwright-run-20.txt`): **115 passed (55.7s)**, 0 failed.
- Status: P2-14 DONE, P2-15 DONE. No open items from this pair.

### Run 21 — P2-11 in place (payment_orders CREATE migration)

- tsc: PASS (0).
- vitest: PASS — **64 files / 678 passed** (62 real files + 1 locked 2-line husk that also runs green, later excluded while OneDrive holds the lock; real guard suite: `p2-11-schema.test.ts`, 4 tests).
- build: PASS (`BUILD=0`, `build-log-run21.txt`).
- Playwright (run 21, `playwright-run-21.txt`): **115 passed (1.8m)**, 0 failed.
- Migration chain proof: fresh Postgres 16 - 001..011 + 012 all apply clean, 17 columns confirmed, INSERT/SELECT roundtrip OK (docs in BUG_REPORT P2-11 section).

### Run 22 — entitlement lifetime + cancel-race guard (2026-10-21)

Closed the audit's "entitlement expiry after purchase" open item. The finding
inverted the original question: the product sells **permanent** access
(`UpgradeProModal.tsx:531` — "Akses aktif selamanya sampai kamu lulus CPNS"),
so what needed proving is that a granted entitlement is never revoked by a
later move of the *order*.

| Gate | Result |
| --- | --- |
| `tsc --noEmit` | **PASS** (exit 0) |
| `vitest` | **PASS** — 64 files / **692 tests** (+15) |
| `next build` | **PASS** (`BUILD_EXIT=0`, First Load 158 kB unchanged) |
| `playwright` run 22 | **PASS** — **115 passed / 0 failed**, 58.7 s (`docs/audit/playwright-run-22.txt`) |

**Defect found and fixed while writing the test: `POST /api/payment/cancel`
wrote status unguarded.** The handler read the order, checked
`status === 'pending'`, then ran `UPDATE ... SET status='cancelled'` with no
status predicate. A PAID webhook landing between the read and the write was
overwritten — a genuinely paid order became `cancelled`, so the billing history
denied a payment the learner had made, and the `expires_at = NOW()` write also
freed the unique code for reuse. Fixed by guarding the write on
`AND status = 'pending' RETURNING id` and answering `409` when the guard
matches nothing (the payment won the race), mirroring the webhook transitions
from P1-7.

**Mutation check (the test is not vacuous):** reverting only the guard fails
exactly the two cancel-race cases and nothing else — 2 failed / 13 passed.

**Two pre-existing tests updated to the real contract,** not weakened: both
mocked the successful cancel UPDATE as returning `[]`, which under the guarded
statement now means "matched no row". They return `[{ id }]`, the shape a won
guarded `RETURNING` actually produces.

New suite `tests/entitlement-lifetime.test.ts` (15 cases) covers: EXPIRED
replayed after PAID, duplicate PAID delivery, a paid order refusing cancel, the
sync poller answering without re-granting, cancel losing the race (409),
cross-account cancel refusal, exactly-once grant across both payment paths
(webhook and sync, including the losing side of each transition), unknown
order_type never falling through to PRO, and additive/idempotent unlocks
(second purchase does not drop the first, no duplicate ids, no PRO downgrade).
