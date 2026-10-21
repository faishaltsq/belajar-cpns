# TEST PLAN — Lolosin.com

Status of this document: **current for the working tree of 2026-10-21**.
Statuses used throughout: PASS / FAIL / BLOCKED / NOT RUN. Nothing is called PASS
unless a command produced it.

---

## 1. Test layers

| Layer | Tool | Command | Where it runs |
|---|---|---|---|
| Unit + integration (business logic, API handlers) | Vitest 2 | `npm test` (`npx vitest run`) | CI (`.github/workflows/ci.yml`) and locally |
| Type safety | TypeScript | `npx tsc --noEmit` | CI and locally |
| Production build | Next.js 14 | `npx next build` | CI and locally |
| End-to-end (browser) | Playwright 1.64 | `npx playwright test` | locally; not yet wired into CI |
| Lint | `next lint` | `npm run lint` | exists in `package.json`; not part of CI |

`vitest.config.ts` excludes `tests/e2e/**` so Vitest never tries to collect
Playwright specs.

## 2. Environments

- **Local, no build**: `npx next start` after `npx next build` — this is what
  Playwright targets (`playwright.config.ts` → `webServer`), port 3100.
- **Database**: the app talks to Neon Postgres when `DATABASE_URL`/`POSTGRES_URL`
  is present, and falls back to static package JSON otherwise. Unit tests mock
  `@/lib/db` entirely — they never touch a database.
- **Payments**: no automated test ever creates a real order or calls KlikQRIS.
  The gateway is mocked (`tests/qa-agent-payment.test.ts`,
  `tests/klikqris-payment.test.ts`); webhook payloads are signed with a test
  secret. Sandbox/live keys are never read by a test.
- **Analytics in local runs**: `@vercel/analytics` and `@vercel/speed-insights`
  inject `/_vercel/…` scripts that only exist inside Vercel's runtime, so they
  404 locally. E2E treats `/_vercel/` as environment noise, not an application
  defect.

## 3. Coverage map

### 3.1 Exam correctness and score integrity — vitest

| Area | Suite | Status |
|---|---|---|
| Score computation, section limits, passing grades | `tests/serverScoring.test.ts`, scoring suites | PASS (567-test baseline) |
| Server is the sole scorer (client scorer removed) | `tests/*scoring*` | PASS |
| Practice mode scores but never persists | results-route suites | PASS |
| Pause deadline arithmetic (stale marker, exact duration) | `tests/exam-clock.test.ts` | PASS |
| Exam rules single source (year/grades/limits) | `tests/content-consistency.test.ts` | PASS |

### 3.2 Entitlement and payment integrity — vitest

| Area | Suite | Status |
|---|---|---|
| Paid packages blocked server-side on questions/results/drill | `tests/entitlement-gate.test.ts` | PASS |
| Webhook signature, amount, idempotency, EXPIRED guard | `tests/qa-agent-payment.test.ts`, `tests/payment-grant-integrity.test.ts` | PASS |
| Entitlement grant is one atomic statement (no read-modify-write) | `tests/payment-grant-integrity.test.ts` | PASS (SQL additionally verified against PostgreSQL 16 in Docker) |
| Order status transitions | `tests/payment-history.test.ts`, `tests/klikqris-payment.test.ts` | PASS |
| Sandbox-only payment testing | §2 | Enforced by convention — no live payment test exists |

### 3.3 Auth and session

| Area | Suite | Status |
|---|---|---|
| Signup/login/logout/session expiry | `tests/auth*.test.ts`, `tests/qa-agent-auth.test.ts` | PASS |
| Session probe answers 200 with `user: null` for guests | `tests/auth-session-probe.test.ts` | PASS |

### 3.4 Roadmap / streak

| Area | Suite | Status |
|---|---|---|
| Streak counts local calendar days at every hour | `tests/streak-timezone.test.ts` | PASS |
| Roadmap completion, percentage, persistence | `tests/qa-agent-ancillary.test.ts` | PASS |

### 3.5 Browser E2E — Playwright

Viewports: 1440, 1280, 768, 390, 320 (one project each).
Specs live in `tests/e2e/`.

| Spec | What it asserts | Status |
|---|---|---|
| `homepage.spec.ts` | render, console cleanliness, no horizontal overflow, CTA target, every internal link ≥ 400 rejected, back/forward, keyboard focus indicator, off-screen content | See `docs/testing/TEST_RESULTS.md` |
| `cat-tryout.spec.ts` | full CAT SKD lifecycle: start → answer → navigate → refresh recovery → submit → score | NOT RUN (not written yet) |
| Latihan Kilat, Flashcards, Roadmap, Ulang Soal Salah, Psikotes | module-level flows | NOT RUN |
| Auth / PRO / payment E2E | guest access, paywall, upgrade | NOT RUN — deliberately vitest-only while it can run headless without a real gateway |

## 4. Rules for this suite

1. Never run a real paid transaction. Payment paths stay mocked or sandboxed.
2. Never read `.env` values into a test or print them.
3. E2E writes only to `localStorage` of its own browser profile; it never
   mutates production data and never hits the production host.
4. A failing E2E keeps its trace and screenshot (`trace: 'retain-on-failure'`,
   `screenshot: 'only-on-failure'`), stored under `test-results/`.
5. A feature that was not exercised is recorded as NOT RUN, never as PASS.

## 5. Known gaps (tracked, not silently skipped)

- **CI does not run Playwright.** Adding it needs a browser install step
  (`npx playwright install --with-deps chromium`) and a runner image; until then
  E2E is a local gate.
- **No Lighthouse/LCP/CLS measurement yet** — `docs/audit/PERFORMANCE_REPORT.md`
  holds what was measured manually.
- **Payment webhook E2E is vitest-only**, by design (§2).
- **`npm run lint` is not in CI**, so lint regressions are only caught locally.
