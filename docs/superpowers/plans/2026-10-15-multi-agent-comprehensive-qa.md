# Comprehensive Multi-Agent Audit and QA Plan — Lolos.in

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute a deep, exhaustive, multi-agent audit and Quality Assurance pass across the entire Lolos.in platform on production (`https://lolosin.com`), verifying authentication, payment/monetization, CAT exam engine & scoring, ancillary learning features (Drill, Flashcards, Roadmap, Psikotes), and edge security headers.

**Architecture:** Distributed QA execution using 4 specialized parallel subagents with isolated testing scopes: (1) Auth & Session Security, (2) Payment & Monetization Lifecycle, (3) Exam Engine & BKN Scoring Rules, (4) Learning Features & Psikotes Modules. Each subagent runs automated synthetic tests, browser interaction probes, and database/API contract validations, reporting structured findings with severity, root cause, reproduction steps, and fixes.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest, Neon PostgreSQL serverless, KlikQRIS API, Playwright/Browser agent, Web Share API, PWA.

**Spec:** Production platform specifications at `https://lolosin.com`, `docs/qa-full-audit-report.md`, `docs/security-verification.md`, and Kepmen PANRB 321/2024.

---

## Global Constraints

- Domain Target: `https://lolosin.com` (with fallback to `https://belajar-cpns-saas.vercel.app` for staging verification).
- Legal / Brand Compliance: No official BKN or Garuda crests, no false "official government leaked questions" claims, white-label payment flow without 3rd party provider branding.
- Colors & Styling: Claude Amber palette (`#faf9f5` background, `#c96442` primary accent, light mode only, Phosphor icons only).
- Account Isolation: Storage keys must follow `lolos_u_<userId>_<feature>` or `lolos_guest_<feature>`.
- Admin PIN Protection: Timing-safe `x-admin-pin` check on all `/api/admin/*` routes.
- Database: Neon tagged templates (`sql\`...\``) — zero string concatenation.
- Rate Limiting: Persistent PostgreSQL sliding window with fail-open memory fallback.
- Plan Language: English (per project memory convention).

---

## Review Focus

1. **Session Race Conditions on Route Change** — Switching from guest to authenticated user must never leave orphaned guest trial locks or drop active exam drafts.
2. **Payment Webhook Replay & Idempotency** — Submitting identical webhook payloads multiple times must not generate duplicate unlocked packages or corrupt user balance.
3. **CAT Timer Desync & Refresh Recovery** — Browser refresh mid-exam in both Practice and Official modes must accurately retain elapsed time and unanswered questions.
4. **Scoring Formula Edge Boundaries** — Exactly meeting passing grade thresholds (TWK=65, TIU=80, TKP=166) must strictly yield "LOLOS", whereas 1 point below in any single category yields "BELUM MEMENUHI".
5. **Rate Limiting Edge Spoofing** — Requests with spoofed `X-Forwarded-For` headers must still be bounded by the edge-observed proxy IP.

---

## Subagent Architecture & Allocation

```
                        ┌────────────────────────────────────────┐
                        │      Lead Coordinator (Apex Lead)      │
                        │    docs/superpowers/plans/             │
                        └───────────────────┬────────────────────┘
                                            │
        ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
        ▼                   ▼                               ▼                   ▼
┌───────────────┐   ┌───────────────┐               ┌───────────────┐   ┌───────────────┐
│   Agent 1     │   │   Agent 2     │               │   Agent 3     │   │   Agent 4     │
│ Auth & Session│   │ Payment & QRIS│               │ CAT Engine &  │   │ Drill, Cards, │
│   Security    │   │  Monetization │               │ BKN Scoring   │   │ Psikotes, PWA │
└───────────────┘   └───────────────┘               └───────────────┘   └───────────────┘
```

---

## Task Breakdown

### Task 1: Agent 1 — Authentication, Session Lifecycle, and User Storage Hygiene

**Scope:**
- Public auth routes: `/login`, `/api/auth/login`, `/api/auth/register`, `/api/auth/verify-otp`, `/api/auth/verify-link`, `/api/auth/me`, `/api/auth/forgot-password`, `/api/auth/reset-password`.
- Session token storage: `cpns_token` HTTP-only cookie, expiration (7 days), algorithm verification (HS256 via `jose`).
- Multi-tenant data segregation: `scopedKey` isolation between guest (`lolos_guest_*`) and logged-in users (`lolos_u_<userId>_*`).
- User profile & history retrieval: `/api/user/status`, `/riwayat`.

**Execution Steps:**
- [x] **Step 1: Write exhaustive auth test suite**
  Create `tests/qa-agent-auth.test.ts` testing:
  - Register with weak/invalid password and malformed email.
  - OTP verification with valid, expired, and incorrect codes.
  - Cookie security attributes: `HttpOnly`, `SameSite=Lax`, `Secure` in production.
  - Password hashing: bcrypt salt rounds verification.
- [x] **Step 2: Run test suite & verify edge conditions**
  Run: `npx vitest run tests/qa-agent-auth.test.ts`
- [x] **Step 3: Execute live browser probe on `https://lolosin.com/login`**
  Verify:
  - Form validation on empty inputs.
  - Switching between Login and Register tabs.
  - Error banner displays without layout shifts.
  - Redirection logic (`redirectUrl`) preserves original destination.
- [x] **Step 4: Audit storage cleanup**
  Confirm all `lolos_guest_*` keys are removed upon successful user authentication.
- [x] **Step 5: Output Agent 1 Audit Findings**
  Generate `docs/audit-agent-1-auth.md`.

---

### Task 2: Agent 2 — Monetization, KlikQRIS Integration & Order Lifecycle

**Scope:**
- Pricing tiers: Free starter (3 packages: `tryout-mini`, `tryout-1`, `tryout-2`), Single Package (Rp 5.000 / Rp 15.000), PRO All-Access (Rp 49.000 / Rp 50.000).
- Order creation & Unique Code Generation: `/api/payment/create-order`.
- Dynamic QRIS generation & KlikQRIS client interaction: `src/lib/klikqris.ts`.
- Order polling & status tracking: `GET /api/payment/order-status`.
- Order cancellation: `POST /api/payment/cancel`.
- Webhook signature security & idempotency: `POST /api/webhooks/klikqris`.
- Abandoned cart scanner & email reminder: `GET /api/payment/abandoned-reminders`.

**Execution Steps:**
- [ ] **Step 1: Write exhaustive payment test suite**
  Create `tests/qa-agent-payment.test.ts` testing:
  - Base amount vs unique code random addition (`+1..+999`).
  - Webhook with valid MD5/HMAC signature vs spoofed signature.
  - Idempotent double-spend prevention on consecutive webhook deliveries.
  - Order cancellation validation (cannot cancel paid/expired orders).
  - Integer sanitization on order ID queries.
- [ ] **Step 2: Run payment test suite**
  Run: `npx vitest run tests/qa-agent-payment.test.ts`
- [ ] **Step 3: Execute live browser probe on PRO package checkout**
  Verify:
  - Clicking locked PRO card opens `UpgradeProModal`.
  - Unauthenticated modal redirects to login with return path.
  - Price formatting displays standard Indonesian currency (`Rp 50.000`).
  - QRIS image renders with countdown timer and manual sync button.
- [ ] **Step 4: Output Agent 2 Audit Findings**
  Generate `docs/audit-agent-2-payment.md`.

---

### Task 3: Agent 3 — Core CAT Simulation Engine & Scoring Fidelity

**Scope:**
- Tryout catalog: `/simulasi`, `src/lib/loadPackage.ts`, `/api/packages`.
- Exam execution engine: `/simulasi/[id]`.
- Timers: 100 minutes (110 questions, official BKN) and 30 minutes (30 questions, mini tryout).
- Controls: Question navigation drawer (1-110), font size scaler (A-, A, A+), Ragu-ragu checkbox, Next/Prev keyboard shortcuts (`ArrowLeft`, `ArrowRight`).
- Mode selection: Official BKN Mode (strict, no pause, fullscreen/tab detection) vs Practice Mode (pausable, local drafts).
- Scoring logic:
  - TWK: 30 questions, 0 or 5 points (Max: 150, Passing: 65).
  - TIU: 35 questions, 0 or 5 points (Max: 175, Passing: 80).
  - TKP: 45 questions, scale 1 to 5 points (Max: 225, Passing: 166).
  - Total: 110 questions, Max Score: 550, Passing: 311.
- Result page: `/simulasi/hasil/[resultId]`, Web Share WhatsApp, Clipboard summary, PDF print preview, Leaderboard submission.

**Execution Steps:**
- [ ] **Step 1: Write comprehensive CAT engine & scoring test suite**
  Create `tests/qa-agent-exam-engine.test.ts` testing:
  - Exact passing score boundaries (65, 80, 166 -> TRUE).
  - Boundary failure: (64, 80, 166 -> FALSE, 65, 79, 166 -> FALSE, 65, 80, 165 -> FALSE).
  - TKP option weights mapping (options A-E strictly mapping to distinct integers 1..5).
  - State resumption from `localStorage` draft.
  - Prevention of score tampering on submission.
- [ ] **Step 2: Run CAT test suite**
  Run: `npx vitest run tests/qa-agent-exam-engine.test.ts`
- [ ] **Step 3: Execute live browser simulation run**
  Verify:
  - Launch `/simulasi/tryout-mini` on `https://lolosin.com`.
  - Answer 30 questions across TWK, TIU, TKP.
  - Submit exam and inspect `/simulasi/hasil/[resultId]`.
  - Verify Radar / Breakdown chart, Bedah Soal answers, and WhatsApp Share URL formatting.
- [ ] **Step 4: Output Agent 3 Audit Findings**
  Generate `docs/audit-agent-3-exam.md`.

---

### Task 4: Agent 4 — Ancillary Modules, Psikotes, PWA & Security Edge

**Scope:**
- Latihan Kilat (Drill): `/drill`, 18 categories, instant answer explanation modal, guest trial cap.
- Flashcards: `/flashcard`, flip animation, TWK/TIU/TKP category filters, local mastery progress.
- Learning Roadmap: `/journey`, 30-day curriculum checklist, progress percentage calculation.
- Psikotes Suites:
  - Kraepelin / Koran Test (`/psikotes/kraepelin`): multi-column number addition, tempo timer, fatigue curve chart.
  - Kecermatan Angka & Huruf (`/psikotes/kecermatan-angka`, `/psikotes/kecermatan-huruf`): missing symbol grid, precision score.
  - Penalaran Logis (`/psikotes/penalaran`): syllogism & analytical deduction.
  - PAPI Kostick (`/psikotes/kepribadian`): forced-choice personality matrix (20 dimensions).
- PWA & Mobile Web: `public/manifest.json`, standalone display, service worker registration readiness, viewport meta.
- Security Headers: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Timing-safe Admin PIN.

**Execution Steps:**
- [ ] **Step 1: Write ancillary modules test suite**
  Create `tests/qa-agent-ancillary.test.ts` testing:
  - Kraepelin column transition math and speed/accuracy calculations.
  - PAPI Kostick 90-pair personality vector calculations.
  - PWA manifest schema validity and icon asset sizes.
  - Security headers presence on all static and dynamic responses.
- [ ] **Step 2: Run ancillary test suite**
  Run: `npx vitest run tests/qa-agent-ancillary.test.ts`
- [ ] **Step 3: Execute live browser probe on Psikotes & PWA**
  Verify:
  - Start Kraepelin session and test digit input responsiveness.
  - Test Kecermatan symbol selection under keyboard input.
  - Verify manifest parsing via browser DevTools inspection.
- [ ] **Step 4: Output Agent 4 Audit Findings**
  Generate `docs/audit-agent-4-ancillary.md`.

---

### Task 5: Consolidation, Defect Remediation & Final Quality Gate

**Execution Steps:**
- [ ] **Step 1: Aggregate findings from all 4 subagent reports**
  Collate defects into: Critical / High / Medium / Low.
- [ ] **Step 2: Implement necessary hotfixes**
  Apply fixes with TDD cycles (failing test -> fix -> verify).
- [ ] **Step 3: Run full regression test suite**
  Execute: `npx vitest run` across all test files.
- [ ] **Step 4: Final Production Build & Deployment Verification**
  Execute: `npm run build`, git commit, push, and verify live on `https://lolosin.com`.
- [ ] **Step 5: Deliver Master QA Audit Report**
  Write and finalize `docs/qa-master-audit-final.md`.
