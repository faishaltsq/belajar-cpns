# Master QA Audit — Lolosin.com

**What this is.** The consolidated QA record for `belajar-cpns-saas`, and the
deliverable of `docs/superpowers/plans/2026-10-15-multi-agent-comprehensive-qa.md`
Task 5 Step 5. It merges the four sub-agent reports of 2026-10-15 into one defect
register, reconciles them against the live register, and separates what is
verified from what is not.

**Tree described.** `git log -1` → **`e7500aa`** *"fix(payment): guard cancel
against a settling payment; pin entitlement lifetime"*. Where the working tree
differs from that commit, the difference is named in §1.2.

**Evidence standard.** Every claim is backed by a file path with a line reference,
a command whose output is quoted, or a test that ran. Anything read but not
executed is labelled **hypothesis**. Nothing is PASS because it looked right.
Where a sub-agent report disagrees with `docs/audit/BUG_REPORT.md` or a run log,
the register and the log win, and §5 says so in each specific case.

Status legend, as in the register: **FIXED** (change landed and covered), **OPEN**
(verified, not fixed), **NOT RUN** (not exercised — never labelled PASS).

---

## 1. Scope

### 1.1 Documents reconciled

The four sub-agent reports — `docs/audit-agent-1-auth.md` (170 lines),
`-2-payment.md` (297), `-3-exam.md` (215), `-4-ancillary.md` (305) — against
`docs/audit/BUG_REPORT.md` (487, authoritative) and `docs/testing/TEST_RESULTS.md`
(202, runs 1–22), plus `SECURITY_REVIEW.md`, `TECHNICAL_DEBT.md` (V-x verified /
H-x hypothesis), `PERFORMANCE_REPORT.md` (M measured / E estimated),
`CONTENT_CONSISTENCY.md`, `PROJECT_DISCOVERY.md`, `FEATURE_INVENTORY.md`,
`USER_JOURNEYS.md`, `UX_RECOMMENDATIONS.md`, `MIGRATION_012_VERIFICATION.md`,
`P2-13-FIGURAL.md`, and `docs/product/{FEATURE_ROADMAP,IMPLEMENTATION_DECISIONS}.md`.

### 1.2 Working tree vs `e7500aa`

`git status --porcelain`, captured at the end of this audit — note that a
concurrent workstream was editing `ExamSession.tsx` and the resilience spec while
this document was being written, so the tree is not frozen:

```
 M docs/audit/BUG_REPORT.md          ?? docs/audit/MIGRATION_012_VERIFICATION.md
 M src/app/admin-kelola/page.tsx     ?? docs/audit/P2-13-FIGURAL.md
 M src/app/riwayat/page.tsx          ?? docs/audit/playwright-run-23.txt
 M src/app/simulasi/[id]/ExamSession.tsx   ?? docs/qa-master-audit-final.md
 M tests/copy-claims.test.ts         ?? src/components/admin/CustomTestCreator.tsx
                                     ?? tests/e2e/exam-resilience.spec.ts
```

1. **P3-16 (guest `/riwayat` banner) is fixed only in the working tree** — code at
   `src/app/riwayat/page.tsx:305-309`, four tests in `tests/copy-claims.test.ts`.
   Everything else in the register is in `e7500aa`.
2. **`tests/e2e/exam-resilience.spec.ts` is a concurrent workstream, not this
   one.** It grew 8 → 9 cases and its MD5 moved `23f45fa3…` → `4efec6eb…` between
   15:54 and 16:07 while I read it. Untracked, currently red (§6.5). Its existence
   does not make P1-3/P1-4/P1-5 verified. `ExamSession.tsx` gained a 7-line edit
   during the same window — unverified, and not covered by any gate reported here.
3. `src/components/admin/CustomTestCreator.tsx` is new, untracked, untested, and
   the only consumer of the `admin-kelola` tab added in the working tree.
4. `MIGRATION_012_VERIFICATION.md` and `P2-13-FIGURAL.md` are the two most
   consequential untracked documents here; both contradict earlier register text
   (§5.5).

---

## 2. Executive summary

The product is materially better than the register's oldest entries suggest, and
its residual risk has moved from **security** to **content and provenance**. Every
P0 is closed behind a test that ran: the premium bypass (P0-1) is enforced in
`src/lib/entitlement.ts` and pinned by 21 cases; the practice-mode `NaN` (P0-2) is
gone because the server is now the only scorer; the Neon driver no longer reaches
the browser bundle (P0-12, First Load shared 158 kB); `/api/packages` is cacheable
(P0-13). All four gates are green today — `tsc` exit 0, **64 files / 696 tests**,
build `BUILD_EXIT=0`, **115 E2E passed / 0 failed**. Payment integrity is the
strongest part of the codebase: P1-7, P1-8 and P1-10b are single-statement
atomicity fixes with mutation-checked tests.

Two things still matter most.

**What a paying learner actually receives.** 59 of 82 questions in
`tryout-figural-2.json` have no explanation, and 21 TKP items carry option weights
that are not a permutation of 1–5 — which the runtime silently rewrites at load
time (`normalizeQuestionScores`, `src/lib/loadPackage.ts:5-24`), so the score
served is not the score in the JSON. Neither is a register row with an owner: the
59 are a blocked sub-item of P2-13, the 21 are in no row at all.

**The proof for the exam-resilience fixes is not in the repository.** P1-3, P1-4
and P1-5 are FIXED with "regression test: NOT RUN" in their own entries, and the
only spec that would close them is untracked and red. A learner losing a finished
paper on a dropped connection is the highest-consequence client-side failure the
product can have, and it is the one fix with no green gate behind it.

---

## 3. Severity rollup

Enumerated row by row from `BUG_REPORT.md` — **26 defects**, not estimated.
Grouped by id series; P3-18 states severity P2 in the register, which moves one row
between the P2 and P3 lines but not the total.

| Severity (id series) | FIXED | OPEN | NOT RUN | Total |
|---|---:|---:|---:|---:|
| P0 | 4 | 0 | 0 | **4** |
| P1 | 10 | 0 | 0 | **10** |
| P2 | 7 | 2 | 0 | **9** |
| P3 | 1 | 2 | 0 | **3** |
| **Total** | **22** | **4** | **0** | **26** |

Basis for the P2 line: FIXED are P2-7, P2-8, P2-9, P2-10, P2-14, P2-15 and
**P2-11** (the register's own "status: DONE" for the migration, counted FIXED here
even though it does not describe production — §7.3). OPEN are P2-12 (stale, §5.5)
and P2-13.

**Why NOT RUN is zero.** The register never files an unexercised item as its own
row; it records the gap inside the item's evidence line. Six FIXED items therefore
carry a regression test that has not run:

| ID | Fix | Regression test |
|---|---|---|
| P0-13 | cache header on `/api/packages` | NOT RUN — "re-measure TTFB before closing" |
| P1-3 | drafts survive a failed POST | NOT RUN in `e7500aa`; untracked spec red (§6.5) |
| P1-4 | auth probe gates the mount effects | NOT RUN in `e7500aa`; untracked spec red |
| P1-5 | duration clamped to `examDuration` | NOT RUN in `e7500aa`; untracked spec red |
| P2-7 | leave-guards gated on `questions.length` | no direct test (folded into P1-4) |
| P2-8 | `isSubmitting` / `errorMessage` in the dialog | one case in the untracked spec only |

Honest split of the 22 FIXED: **16 covered by a test that ran**, **6 covered only
by code plus a stated gap**.

---

## 4. Consolidated defect register

Every row exists in `BUG_REPORT.md`. "Backed by" is the artifact that makes the
status checkable, not a paraphrase of it.

| ID | Sev | One-line description | Status | Backed by |
|---|---|---|---|---|
| P0-1 | P0 | Paid packages served to anyone; paywall was UI-only | FIXED | `src/lib/entitlement.ts`; `tests/entitlement-gate.test.ts` 21/21 |
| P0-2 | P0 | Practice mode produced `NaN` (client summed stripped `score`) | FIXED | `entitlement-gate.test.ts`, 4 practice cases |
| P0-12 | P0 | Neon driver shipped to the client bundle (171.7 KB raw) | FIXED | no `NeonQueryFunction` in `.next/static/chunks`; First Load 232→187 kB |
| P0-13 | P0 | `/api/packages` answered `no-store`, 1.94 s TTFB | FIXED | `public, s-maxage=300, swr=1800` — **TTFB NOT RUN** |
| P1-3 | P1 | A failed submission silently destroyed the paper and drafts | FIXED | `ExamSession.tsx` draft handling — **browser test NOT RUN** |
| P1-4 | P1 | Auth resolving mid-exam swapped the paper, reset the clock | FIXED | effects gated on `userLoading === false` — **browser NOT RUN** |
| P1-5 | P1 | Duration clamped to the removed `EXAM_DURATION = 6000` | FIXED | clamp to `examDuration` — **browser NOT RUN** |
| P1-6 | P1 | A practice pause was still charged against the paper | FIXED | `tests/exam-clock.test.ts` 10/10 |
| P1-7 | P1 | Replayed EXPIRED webhook could unpick a paid order | FIXED | `tests/payment-grant-integrity.test.ts` 17/17 |
| P1-8 | P1 | Two concurrent grants could drop one unlock | FIXED | single `UPDATE … jsonb_agg`; verified on PostgreSQL 16 in Docker |
| P1-9 | P1 | Streak read 0 for seven hours every morning (UTC vs local) | FIXED | `tests/streak-timezone.test.ts` 9/9 |
| P1-10a | P1 | Homepage typed `36 Paket` / `3.816 Soal`; catalogue 37 / 3.898 | FIXED | `tests/content-consistency.test.ts` 9/9 |
| P1-11 | P1 | Abandoned-reminder endpoint failed **open** with no secret | FIXED | `tests/abandoned-reminders-auth.test.ts` 6/6 |
| P1-10b | P1 | Cancel raced a settling payment, overwrote a paid order | FIXED | `tests/entitlement-lifetime.test.ts` 15/15, mutation-checked |
| P2-7 | P2 | Leave-confirmation handlers fired on the paywall screen | FIXED | gated on `questions.length > 0` |
| P2-8 | P2 | Submission had no feedback; dialog closed optimistically | FIXED | `FinishExamModal` `isSubmitting`/`errorMessage` |
| P2-9 | P2 | Catalogue counts, exam year, passing grades had no owner | FIXED | `content-consistency.test.ts` 9/9 |
| P2-10 | P2 | Webhook tests leaked queued mock rows between cases | FIXED | `mockSql.mockReset()`; `klikqris-payment.test.ts` 12/12 |
| P2-11 | P2 | No migration ever created `payment_orders` | FIXED (repo) / diverges in prod | `migrations/012_…sql`; `p2-11-schema.test.ts` 4/4; `MIGRATION_012_VERIFICATION.md` |
| P2-12 | P2 | Data layer only spoke Neon SQL-over-HTTP | **stale OPEN** | `src/lib/db.ts:16-65` (`resolveTransport`); **no test** |
| P2-13 | P2 | Explanations missing (59) or garbled (0 now) | OPEN | `node scripts/_content_scan.mjs` → `missingExplanation: 59` |
| P2-14 | P2 | Prices typed into JSX, ignoring `PRICE_TABLE` overrides | FIXED | `tests/pricing-route.test.ts` 4/4; `copy-claims.test.ts` |
| P2-15 | P2 | FAQ called the 2027 grade "resmi" against `verification: 'reference'` | FIXED | `tests/copy-claims.test.ts` 8/8 |
| P3-16 | P3 | Guest `/riwayat` banner promised storage the page deletes | FIXED (uncommitted) | `copy-claims.test.ts` 8/8, mutation-checked |
| P3-17 | P3 | Four papers deliver the same item twice in one sitting | OPEN | `BUG_REPORT.md:454-469`, full pair list |
| P3-18 | P2 | Five figures keyed differently across papers | OPEN | `BUG_REPORT.md:471-485`, SHA-1 image comparison |

### 4.1 The register's own defects

Statuses are authoritative; the identifiers are not clean:

- **`P1-10` is used twice** for unrelated defects — typed homepage totals
  (`BUG_REPORT.md:181`) and the cancel race (`:364`). Separated here as
  P1-10a / P1-10b.
- **P0s are numbered inside the P1 series**: `P0-12`, `P0-13` follow `P1-11`.
- **Ids that never existed here**: P1-1, P1-2, P2-1…P2-6, P3-1…P3-15. `P1-1` and
  `P1-2` *do* exist in `UX_RECOMMENDATIONS.md` and mean something else entirely
  (reduced motion; skip link). Two documents, one namespace.
- **`P3-18` carries a P2 severity**, contradicting its id.

---

## 5. Reconciliation: four sub-agent reports vs the live register

The reports were written 2026-10-15 and committed in `b0b3063` — the same commit
that repaired most of what they found. Read against `e7500aa`:

### 5.1 What became a numbered defect

| Sub-agent finding | Became | Note |
|---|---|---|
| A2 F1 — webhook signature bypass when `signature IS NULL` | **no P number**; closed in `SECURITY_REVIEW.md` §2 | Real, fixed: `route.ts:62-79` rejects a NULL stored signature and compares with `crypto.timingSafeEqual`. No register row — which is why it reads as unactioned |
| A2 F4 — concurrent webhook double-fulfilment | P1-7 / P1-8 | The recommended `UPDATE … WHERE status='pending' RETURNING id` is exactly what shipped |
| A3 — 6 TWK/TIU questions with every option scored 0 | **no P number**; fixed in `b0b3063` | Verified against `b0b3063^`: **6** zero-max questions; at `e7500aa`, **0** |
| A3 — 249 TKP questions with duplicate weights | **no P number**; mostly fixed | `b0b3063^` → **249**; `e7500aa` → **21**. 228 repaired, 21 left with no register row (§7.1) |
| A1 F-01 / A4 §6.1 — helpers trapped in components | no P number; resolved | `src/lib/userStorage.ts` now exports `GUEST_TRIAL_KEYS`, `clearGuestTrialFlags`, `clearAllGuestData`; `stripQuestionPrefix`, `matchSubCategory`, `DRILL_TOPICS`, `calcStreak` hoisted and exported |

### 5.2 Duplicates of each other

- **A2 F1 ≈ A2 F4**: both are "an unauthenticated or replayed webhook can fulfil
  an order". One line of work (P1-7/P1-8), one security-review entry.
- **A1 F-01 ≈ A4 §6.1**: the same pattern — logic trapped in page components,
  duplicated as literals — fixed the same way, by exporting from `src/lib/`. One
  refactor, two reports.
- **A3's draft-index fix ≈ P1-4**: same key (`exam_index_*`). A3 fixed the index;
  the later pass fixed the *scope* of every draft key. A3 presents the index as the
  whole recovery story, which is why the mid-exam scope swap was invisible to it.

### 5.3 Claims now stale or wrong

- **A4 certified the streak maths against ISO dates.** That is P1-9: a
  locally-written date compared to a UTC-derived one returned 0 for seven hours
  every morning in WIB. A4's test passed only because it ran between 07:00 and
  24:00 local (`BUG_REPORT.md:106`). **A4's clean bill on the streak is withdrawn.**
- **A3 claimed "100% compliant with Kepmen PANRB 321/2024".** `src/lib/examRules.ts`
  marks year and grades `verification: 'reference'`, and P2-15 removed "resmi" from
  the FAQ for exactly that reason. The arithmetic (65/80/166, max 550, no negative
  marking) is verified; the regulatory claim is uncited and must not be repeated.
- **A4 claimed every question has a clear Indonesian explanation** and that all 82
  figural items are complete. The scanner reports `missingExplanation: 59`, all in
  `tryout-figural-2.json`. A4 validated structure — ids, option counts, image
  paths — and inferred explanations from the shape.
- **A2 §3.4 describes cancel as having a "state transition guard".** The
  read-then-check-then-write it describes *was* the defect (P1-10b): the pre-check
  is not atomic with the write, so a PAID webhook in that window was overwritten.
  A2 read the guard and missed the race.
- **A1 and A2 both report "PASSED"** while P0-1 — paid content served to anyone —
  sat in the routes neither tested for authorization. A1 audited *who you are*; A2
  audited *whether the money settled*; nobody checked *whether the caller may see
  this package* until the later pass.
- **A1 F-04** ("derive a secret if `JWT_SECRET` is missing") is superseded in the
  opposite direction: `src/lib/auth.ts:8-11` now **throws** in production when the
  secret is unset. The dev-only derivation remains (`:20-26`) and is why 7 auth
  tests fail by design under `NODE_ENV=production`.
- **A4 REC-A4-04** ("maintain strict `connect-src 'self'`") no longer describes the
  code: `next.config.js:18` ships a whitelist for Google Analytics, Vercel insights
  and Sentry ingest.

### 5.4 Two retractions inside the audit record

1. **The scanner that walked 0 questions.** An earlier pass reported the package
   JSON **OK** using a reader shaped `raw.questions ?? raw.items ?? []`; the files
   are a plain object keyed by index, so it scanned **0 questions** and the OK was
   vacuous. Retracted in `CONTENT_CONSISTENCY.md` §Correction. Every count here
   comes from the corrected reader, re-run today: `{"packages":37,"questions":3898}`,
   `missingExplanation: 59`, `latexGarbled: 0`, `repeatedText: 219`.
2. **"Image analysis is unavailable."** `BUG_REPORT.md:284-293` lists four vision
   failures and marks P2-13 blocked on them. `P2-13-FIGURAL.md` retracts the
   premise: vision is reachable, but it **misreads these figures** — 2 of 5
   calibration items reproduced the key, one answer was self-contradictory. The
   blocker is accuracy, not availability. The distinction matters: the first
   invites a retry, the second says a retry yields plausible wrong explanations,
   which is the defect P2-13 exists to prevent.

### 5.5 Where the register is behind the code, and behind its own evidence

- **P2-12 is stale.** It says OPEN / "documented, not changed", but
  `src/lib/db.ts:16-65` at `e7500aa` negotiates transport (`.neon.tech` → HTTP,
  anything else → `pg` Pool) and exports `resolveTransport`. The fix landed; the
  row did not move. **Register behind code.**
- `BUG_REPORT.md:343` justified `expires_at` having no default as deliberate.
  Production has `DEFAULT now() + interval '3 hours'`, so the rationale is
  contradicted by the database. **Register wrong.**
- `BUG_REPORT.md:398` claims 012 is "idempotent, so the prod DB … is unharmed".
  Both `CREATE INDEX IF NOT EXISTS` statements and the `COMMENT ON TABLE` **do**
  execute there, because neither index and no comment exist. **Register wrong.**
- `BUG_REPORT.md:400` records `last_reminded_at` as drift. It is a **live
  production failure**: the column exists nowhere in the database, so
  `POST /api/payment/abandoned-reminders` returns 500 on every invocation
  (`route.ts:34,41,71`). **Register understated it.**

### 5.6 Never actioned

| Finding | Source | Status today |
|---|---|---|
| OTP uses `Math.random()`, not a CSPRNG (A1 F-02) | `register/route.ts:13`, `forgot-password/route.ts:7` | **Unchanged.** `grep -rn randomInt src/` → no matches |
| Timing side-channel: missing user returns before bcrypt (A1 F-03) | `login/route.ts:25-32` | **Unchanged.** No dummy comparison |
| Service worker / offline caching (A4 REC-A4-01) | `public/` has no SW; no `next-pwa`/`serwist` | **Not done**, deliberately (§8) |
| PNG icon fallbacks 192/512 (A4 REC-A4-02) | `public/manifest.json` icons = `/icon.svg` only | **Not done** |
| 20-aspect PAPI radar (A4 REC-A4-03) | `/psikotes/hasil` renders 5 dimensions | **Not done** — product decision |
| Underpayment guard when `paidAmount === 0` (A2 F2) | `route.ts:84-87` keeps the `> 0` carve-out | **Half-closed** — `TECHNICAL_DEBT.md` H-6 still records a zero-amount webhook settling an order |

---

## 6. Test coverage reality

### 6.1 What ran

| Gate | Result | Provenance |
|---|---|---|
| `unset NODE_ENV && npx tsc --noEmit` | **exit 0** | today |
| `unset NODE_ENV && npx vitest run` | **64 files / 696 tests passed** | today |
| same, committed baseline | **64 files / 692 tests** | run 22, `TEST_RESULTS.md:173` |
| `unset NODE_ENV && npx next build` | **`BUILD_EXIT=0`**, First Load shared **158 kB** | today |
| `npx playwright test` on the 4 committed specs | **115 passed / 0 failed** (1.0 m) | today |
| `npx playwright test` (recorded) | **115 passed / 58.7 s**, `PW_EXIT=0` | run 22, `playwright-run-22.txt` |

The 692 → 696 delta is exactly the four P3-16 cases (`tests/copy-claims.test.ts`,
4 → 8 tests) in the working tree. Nothing else moved.

`NODE_ENV` must be unset: with `NODE_ENV=production`, 7 auth tests fail by design
because `src/lib/auth.ts:8-11` refuses to sign or verify a JWT without
`JWT_SECRET`. That is fail-closed behaviour, not a regression.

### 6.2 Shape of the suite

- **65 test files on disk, 64 collected.** `tests/p2-11-payment-orders-schema.test.ts`
  is a 2-line husk excluded in `vitest.config.ts` — OneDrive held a file lock
  during a botched overwrite; the real content is `p2-11-schema.test.ts` (4 tests).
- **E2E is 23 unique cases × 5 viewports** (1440/1280/768/390/320) = 115:
  `homepage` 12, `cat-tryout` 6, `daily-mission` 2, `progress-card` 3.
- **38 API route handlers.** The security-critical ones (auth, payment,
  entitlement, results, drill) have unit tests; admin CRUD is covered only by
  `admin-guard.test.ts`.
- **Two structural gaps, not accidents.** No test reads `src/lib/db.ts`, so
  `resolveTransport` has none. And the package-integrity tests open 18 of 37
  packages — `sample_questions.json` plus `tryout-2…17` and `tryout-mini`
  (`tests/generate-soal.test.ts:107-125`). The 21 remaining TKP anomalies live in
  `tryout-22, 27, 28, 29, 30, 31, 33, 34` — the exact set no integrity test opens.
  That is why they survived the repair.

### 6.3 Covered / not covered by layer

Unit tests cover scoring arithmetic (`scoring.test.ts`, `qa-agent-exam-engine` 21:
boundaries 65/80/166, no negative marking, TKP 1–5); entitlement
(`entitlement-gate` 21: decision table, three routes, fail-closed with no DB, cache
headers); payment (`klikqris-payment` 12, `payment-grant-integrity` 17,
`entitlement-lifetime` 15, `payment-cancel`, `payment-history`, `webhook-klikqris`,
`pricing-route` 4, `price-authority`); the exam clock and mode (`exam-clock` 10,
`exam-mode`, `exam-flow`, `keyboard-navigation`, `question-navigation-modal`);
content (`content-consistency` 9, `copy-claims` 8, `explanation-parser`); and
operability (`p2-11-schema` 4, `rate-limit-store`, `rate-limit-ip`).

Not covered: `results/[id]/review` beyond ownership; a real gateway transaction
(§8); P1-3/P1-4/P1-5 in a browser (§6.5); 19 of 37 packages and explanation
*quality*; WCAG conformance (Lighthouse a11y is **90**); migration-vs-production
fidelity and the `db.ts` transport.

### 6.4 The honest NOT RUN list

| Item | Status now |
|---|---|
| Screen-reader announcement of the exam timer | **Still open.** `src/components/Timer.tsx` has no `role`, no `aria-label`, no `aria-live` (0 matches in that file). `aria-live` exists in exactly two components (`DailyMissionCard.tsx:39`, `ProgressSnapshotCard.tsx:77`) — not the timer. `UX_RECOMMENDATIONS.md` P1-3 documents it |
| Progress card rendered for a **logged-in** user | **Still open.** `tests/e2e/progress-card.spec.ts:12-13` states it needs a signed `cpns_token`, i.e. `JWT_SECRET`, which the E2E server lacks by design. Aggregation is pinned by `progress-analytics.test.ts` (13); the rendered card is not |
| Entitlement expiry after purchase | **Closed by inverting the premise.** The product sells permanent access (`UpgradeProModal.tsx:531`), so there is no expiry to test. Restated as "can a granted entitlement be revoked by a later move of the order?" and closed by `entitlement-lifetime.test.ts` (15, mutation-checked) — `BUG_REPORT.md:376-388` |
| `/api/packages` TTFB after the cache change | **Still open.** P0-13 is FIXED; its own entry says "NOT RUN — re-measure TTFB before closing" |
| Lighthouse / LCP / CLS on the current tree | **Stale, not run.** The three `lighthouse-*.json` files are from 2026-10-20 against the deployed build, which predates P0-12/P0-13/P2-14 |
| Real payment transactions | **Never run, by design** (§8) |
| E2E against the production database | **Never run, by design** (§8) |
| `npm audit` | **Never run to a recorded result** — `SECURITY_REVIEW.md:104` |

### 6.5 The exam-resilience spec (concurrent, red)

`tests/e2e/exam-resilience.spec.ts` was created during this audit by another
workstream to close P1-3/P1-4/P1-5 in a browser. Observed:

| Run | Result |
|---|---|
| `E2E_PORT=3210 npx playwright test tests/e2e/exam-resilience.spec.ts` (8 cases, MD5 `23f45fa3…`) | **20 passed / 20 failed** — `strict mode violation: getByRole('alert') resolved to 2 elements` (the app alert plus Next's `__next-route-announcer__`), and `getByText(/Soal nomor 1/)` not found on 4 cases |
| Same file after a rebuild (9 cases, MD5 `4efec6eb…`) | **44 passed / 1 failed** — `[mobile-320] the paper never overflows the viewport horizontally` |
| `docs/audit/playwright-run-23.txt` (that workstream's own log) | **39 passed / 1 failed**, same mobile-320 case |

Three runs, three failure sets, on a file whose hash changed twice while I read it.
**This spec is not a gate and must not be cited as one.** The defects it targets
stay FIXED-in-code and NOT RUN-in-browser.

---

## 7. Residual risk register

Ordered by real exposure, not by severity label.

### 7.1 What a paying learner receives (highest exposure)

**59 of 82 questions in `tryout-figural-2.json` have no explanation.** Scanner
today: `missingExplanation: 59`, all in that file; the other 36 packages are clean.
The paper is sold. Blocked because every route was tried and rejected — vision
misreads the figures (2/5 calibration), no authored rationale exists
(`src/data/figural_bank_full.json` has explanations for 23 of 82, **0 of the 59**),
the source PDFs give bare key lists, and the live `question_bank` rows hold
boilerplate (`P2-13-FIGURAL.md` §3).

**21 TKP items still carry non-permutation weights, and the runtime rewrites them
silently.** Direct JSON scan at `e7500aa` — `tryout-22` 3 (`#75` → `[1,2,5,1,3]`,
sum 12), `tryout-27` 3 (`#73` → `[4,5,2,1,4]`, sum 16), `tryout-28` 1 (`#77`),
`tryout-29` 1 (`#79`), `tryout-30` 3 (`#96`), `tryout-31` 3 (`#84`), `tryout-33` 5
(`#75`), `tryout-34` 2 (`#87` → `[4,3,2,5,4]`). The same non-permutation
`[4,5,2,1,4]` (sum 16) appears 9 times across 6 of the 8 packages.

All 21 keep a unique maximum of 5, so the section maximum stays 225 and nobody is
denied a top score. The damage is subtler: the per-item total is not 15, and
`normalizeQuestionScores` (`src/lib/loadPackage.ts:5-24`) re-ranks any non-clean
item to 1..5 at load time by original score with a stable tie-break — so **the
score a learner receives is not the score in the JSON**, and the tie-break is
deterministic but arbitrary. Nothing tests it; no register row records it.

**43 items are duplicated inside a single paper** (P3-17): `tryout-23` 12,
`tryout-24` 16, `tryout-25` 10, `tryout-32` 5 — 26 of them TKP, so the achievable
TKP total is inflated against a 45-item section. Fixing it means writing 43
replacement items.

**5 figures are keyed differently across papers** (P3-18): the same picture is
"Gambar E" in `tryout-12#64` and "Gambar D" in `tryout-9#59`. A learner who
practises both is told two different answers for one image. Needs the figure read —
same blocker as the explanations.

### 7.2 A learner losing a finished paper (high consequence, no gate)

P1-3/P1-4/P1-5 were fixed by reading code. The only browser proof is the untracked,
red spec (§6.5). If a fix regressed: a network drop at submit navigates away with a
local result and deletes every draft key, so the answers and the original start
timestamp are gone (`BUG_REPORT.md:42-49`). **Exposure: every exam submission on a
weak connection.**

### 7.3 Production schema and provisioning

- **`last_reminded_at` does not exist in production.**
  `POST /api/payment/abandoned-reminders` selects, filters and writes it
  (`route.ts:34,41,71`) and returns 500 on every invocation. Reminders have never
  run in production; the failure is silent because it is cron-driven
  (`MIGRATION_012_VERIFICATION.md` D-1).
- **012 is not applied there, and applying it is not a no-op** — both
  `CREATE INDEX IF NOT EXISTS` statements and the `COMMENT ON TABLE` execute.
  Benign on a 91-row table, but DDL, not idempotence.
- **012 does not describe production**: 17 columns claimed / 17 actual, **5
  identical, 11 differing**; `last_reminded_at` only in the migration,
  `saweria_donation_id` only in production (47 legacy rows with NULL `user_id`); FK
  has no `ON DELETE CASCADE`; both access-pattern indexes absent;
  `idx_payment_orders_amount` present there and in no migration file.
- **`expires_at` diverges behaviourally.** Production defaults it to `now() + 3h`;
  012 omits the default, so a fresh provision inserts NULL and `create-order`'s
  dedupe (`expires_at > NOW()`) can never match — every click would mint a new
  QRIS. Production works *because* of the default the migration argues against.
- **Neon HTTP transport.** `src/lib/db.ts` negotiates per connection string
  (`.neon.tech` → `neon()`, else a `pg` Pool). Production unchanged, untested
  (§6.2). The constraint that shaped P1-8 still holds: the HTTP path has no
  transaction and no `FOR UPDATE`, so every multi-step write must be one atomic
  statement.

### 7.4 Security items found and left

- **OTP is `Math.random()`** — 6 digits from a non-cryptographic PRNG
  (`register/route.ts:13`, `forgot-password/route.ts:7`). Mitigated by a
  5-per-300 s rate limit, not by entropy.
- **Login timing** — a missing user returns before bcrypt, so latency separates "no
  such account" from "wrong password" (`login/route.ts:25-32`). Same message,
  different clock.
- **No `npm audit` ever recorded** (`SECURITY_REVIEW.md:104`); **`next lint` is not
  a CI step** (`grep -c lint .github/workflows/ci.yml` → 0) with 13
  `eslint-disable` directives in 7 files (`TECHNICAL_DEBT.md` V-13); **a
  zero-amount webhook still settles an order** (`route.ts:84-87` keeps the `> 0`
  carve-out; `TECHNICAL_DEBT.md` H-6).

### 7.5 Accessibility, measured and unfixed

Lighthouse Accessibility **90** on `/`, `/` desktop and `/simulasi`. The census in
`UX_RECOMMENDATIONS.md` is still accurate against `e7500aa`: `role="dialog"` **0**,
`aria-modal` **0**, `prefers-reduced-motion` **0 files**, `<main>` only in
`global-error.tsx`. The primary CTA measures **3.89:1** against a 4.5:1 AA
requirement. `sr-only` now appears twice (`DailyMissionCard`,
`ProgressSnapshotCard`) — the first uses of the pattern P1-2 needs everywhere.

### 7.6 A number that is not a defect count

`repeatedText: 219` decomposes exactly: 114 benign figural instruction stems with a
distinct image per item, 54 cross-package exact duplicates, 43 intra-paper
duplicates (P3-17), 6 reordered copies, 2 generic instruction stems. Answer-key
contradictions reachable through `text`: **zero**. The real contradiction lives in
image keys (P3-18), which the text scanner cannot see.

---

## 8. Deliberately not done, and why

| Not done | Why |
|---|---|
| **Real payment transactions** | No live payment was taken at any point. Payment behaviour is verified against a mocked gateway only (`TEST_RESULTS.md` §5). A production QRIS settlement, a real webhook delivery and a real refund path have never been observed end to end. A correctness boundary, not an oversight: a test that moves money cannot run in a suite |
| **E2E against the production database** | E2E writes rows, and the driver is Neon-HTTP, which cannot talk to a plain Postgres at all. `playwright.config.ts` starts `next start` with `DATABASE_URL=''`, so the suite exercises the fail-closed path and the static JSON (`IMPLEMENTATION_DECISIONS.md` #8). The premium gate is still proven — refusing a paid paper with no database behind it *is* the fail-closed case |
| **Offline examinations** | HELD in `FEATURE_ROADMAP.md`. Timing and state synchronisation are not designed, and caching private exam data would add a failure mode rather than a feature |
| **43 replacement items (P3-17)** | Authoring work. Deleting duplicates drops each paper below 30/35/45 and breaks the scoring normalisation in `src/lib/scoring.ts:38-42` |
| **59 figural explanations (P2-13)** | Writing them from a vision read would assert a pattern nobody verified — the exact failure this defect is about. Four routes tried, all rejected on evidence |
| **Applying 012 to production** | DDL against a live database holding paid orders, and it would not make production match the repo. Needs a decision on `expires_at`, the FK delete rule and the index set first |
| **Commit / push / deploy** | This document is the only artifact. Nothing was staged, committed, pushed or deployed; `e7500aa` is still HEAD. Plan Step 4 was **not** executed for this consolidation |
| **Further `src/lib/db.ts` work** | Transport negotiation landed; the HTTP path still has no transactions, and adding them is an architecture decision, not an audit fix |

---

## 9. Reproducing every gate

From the repository root. `NODE_ENV` must be unset — with it `production`, 7 auth
tests fail by design.

```bash
# 0. The shell may export NODE_ENV=production; clear it.
unset NODE_ENV

# 1. Types
npx tsc --noEmit                       # expect exit 0

# 2. Unit + integration
npx vitest run                         # expect 64 files / 696 tests passed
                                       # (692 on e7500aa without the P3-16 cases)

# 3. Production build (E2E runs against this, not next dev)
npx next build                         # expect BUILD_EXIT=0, First Load JS shared 158 kB

# 4. Browser E2E — full suite
npx playwright test                    # 115 passed on the 4 committed specs;
                                       # 5 specs if the untracked resilience spec
                                       # is present, and that one is red (§6.5)

# 4b. The four committed specs only — what run 22 measured
npx playwright test tests/e2e/homepage.spec.ts \
                    tests/e2e/cat-tryout.spec.ts \
                    tests/e2e/daily-mission.spec.ts \
                    tests/e2e/progress-card.spec.ts

# 5. Content scan (corrected array-shape reader)
node scripts/_content_scan.mjs
# expect {"packages":37,"questions":3898}; dupIds 0; emptyOptions 0;
# noMaxScore 0; missingExplanation 59; latexGarbled 0; repeatedText 219

# 6. Targeted suites behind specific register rows
npx vitest run tests/entitlement-gate.test.ts         # 21 — P0-1, P0-2
npx vitest run tests/exam-clock.test.ts               # 10 — P1-6
npx vitest run tests/payment-grant-integrity.test.ts  # 17 — P1-7, P1-8
npx vitest run tests/entitlement-lifetime.test.ts     # 15 — P1-10b, expiry closure
npx vitest run tests/streak-timezone.test.ts          #  9 — P1-9
npx vitest run tests/abandoned-reminders-auth.test.ts #  6 — P1-11
npx vitest run tests/content-consistency.test.ts      #  9 — P1-10a, P2-9
npx vitest run tests/copy-claims.test.ts              #  8 — P2-15, P3-16
npx vitest run tests/pricing-route.test.ts            #  4 — P2-14
npx vitest run tests/p2-11-schema.test.ts             #  4 — P2-11
npx vitest run tests/klikqris-payment.test.ts         # 12 — P2-10

# 7. The 21 TKP anomalies (§7.1)
node -e "const fs=require('fs'),p=require('path'),d='src/data/packages';let n=0;for(const f of fs.readdirSync(d).filter(x=>x.endsWith('.json'))){const r=JSON.parse(fs.readFileSync(p.join(d,f),'utf8'));for(const q of (Array.isArray(r)?r:Object.values(r))){if(q.category!=='TKP'||!Array.isArray(q.options)||q.options.length!==5)continue;const s=q.options.map(o=>Number(o.score));if(new Set(s).size<5){n++;console.log(f,'#'+q.id,JSON.stringify(s));}}}console.log('total',n)"
# expect: 21 lines, total 21
```

`playwright.config.ts` reads `E2E_PORT` (default 3100) and does not reuse an
existing server. If 3100 is held, pass `E2E_PORT=3210`.

---

## 10. Provenance

**Commands executed for this document** (2026-10-21): `git log -1`,
`git status --porcelain`, `git show --stat b0b3063`, `git archive b0b3063^` plus a
score scan of that snapshot, `git ls-tree` on `HEAD`, `npx tsc --noEmit`,
`npx vitest run`, `npx next build`, `npx playwright test` (full, then the four
committed specs), `npx playwright test --list`, `node scripts/_content_scan.mjs`,
and six one-off Node scans over `src/data/packages/*.json` for zero-max questions,
TKP permutations, per-package breakdowns and TKP score sums. The `b0b3063^`
comparison is load-bearing for §5.1: it turns the sub-agents' 249 + 6 into
verified before/after numbers instead of a claim about what a commit probably did.

**Files created:** this document only. `docs/audit/BUG_REPORT.md` was modified by a
concurrent process during the audit (405 → 487 lines), not by this one; the
487-line version is what §4 and §5 cite.

**Not verified here, and not to be quoted as if it were:** any live production
behaviour, any Lighthouse number (all three JSON files predate the current tree),
the real payment path, and the five browser-level fixes whose spec is red.
