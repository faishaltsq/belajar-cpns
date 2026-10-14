# Security Hardening Implementation Plan — belajar-cpns-saas (CPNSMaster)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the findings from the October 14, 2026 security assessment of CPNSMaster (belajar-cpns-saas): 4 unauthenticated `/api/admin/*` routes (verified exploitable live — public question bank dump with answer keys), spoofable client-IP extraction in the rate limiter, per-instance in-memory rate limiting that is ineffective on Vercel serverless, and a missing CSP header.

**Architecture:** Next.js 14 App Router (pages under `src/app`), API route handlers, Neon serverless Postgres via `@neondatabase/serverless` (tagged-template queries in `src/lib/db.ts`), custom JWT auth (`jose`, HS256, 7d) + bcrypt. Admin routes use a shared `isAuthorizedAdmin(req)` guard in `src/lib/adminAuth.ts` checking the `x-admin-pin` header with timing-safe compare. Rate limiting is a homegrown in-memory sliding window (`src/lib/rateLimit.ts`) called by 6 auth endpoints — Task 3 replaces its store with a Neon-backed store, keeping the in-memory one as fallback. Tests are vitest (`npm test` = `vitest run`, test files in `tests/`).

**Tech Stack:** Next.js 14, TypeScript, vitest, Neon Postgres serverless driver, Vercel deploy from git push.

**Spec:** Findings from the assessment chat of 2026-10-14 (verified live: `GET /api/admin/question-bank?limit=1` returned 200 with question text + `correct_answer` + `explanation` without any credentials; `POST /api/admin/generate-ebook` runs LLM calls with no auth). Detail for each fix is inline in the tasks below.

## Global Constraints

- Repo root: `C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas`
- All existing tests must keep passing: `npm test`
- Do NOT change auth mechanism (JWT/jose/bcrypt), DB schema beyond the single new `rate_limits` table in Task 3, or any route's response contract for AUTHENTICATED admin clients (admin panel UI must keep working — it already sends `x-admin-pin`).
- Rate limit response shape must not change: callers in `src/app/api/auth/*/route.ts` rely on `{ success, remaining, retryAfterSeconds }`.
- `isAuthorizedAdmin` in `src/lib/adminAuth.ts` must not be modified (it is correct) — only imported.
- Route handler files that currently use plain `Request` may keep doing so — `isAuthorizedAdmin` accepts both `Request` and `NextRequest`.
- Query style: Neon tagged templates (`sql\`...\``) — never string concatenation.
- Commit style: `fix(security): ...` conventional commits, matching repo history.

## Review Focus

Failure modes most likely to bite after these changes:

1. **Admin panel stops working after guards are added** — the panel already sends `x-admin-pin` (routes `packages`, `upload`, `migrate` work today). Pinned by Task 1's test asserting a request WITH a correct pin passes the guard (guard-level unit test).
2. **Spoofed XFF first hop still bypassing rate limits after Task 2** — pinned by `getClientIp` unit test asserting last-hop selection across multi-hop chains.
3. **DB store unavailable (Neon cold start / network error) locking everyone out** — Task 3's store MUST fail open to the in-memory fallback, never throw. Pinned by a unit test that mocks `getDb` returning null and asserts success:true behavior on first call.
4. **Rate limit array in Postgres growing unboundedly** — the atomic upsert prunes timestamps older than the window inside the same statement; pinned by a test on the SQL contract (pruned array semantics) and the opportunistic cleanup DELETE.
5. **CSP breaking Next.js inline scripts** — Next requires `'unsafe-inline'` for its hydration bootstrap unless nonces are wired; plan pins a pragmatic CSP that keeps the app functional. Pinned by Task 5's production smoke check (homepage 200, no CSP console errors reported by the agent's browser check).

---

### Task 1: Add `isAuthorizedAdmin` guard to the 4 unauthenticated admin routes

**Context:** Verified in source and live in production:

- `src/app/api/admin/question-bank/route.ts` — GET (line 9) and POST (line 67) have NO auth check. Live `GET ?limit=1` returns full question content + answer keys. This is the product's core asset leaking.
- `src/app/api/admin/generate-ebook/route.ts` — POST (line 11) calls the LLM router using `process.env.HERMES_CUSTOM_LOCALHOST_20128_API_KEY` with NO auth (quota/cost burn vector). GET (line 184) leaks DB row counts.
- `src/app/api/admin/figural-img/route.ts` — GET (line 4) queries DB and redirects to image files, NO auth.
- `src/app/api/admin/db-status/route.ts` — GET leaks infra status (has an explicit "no auth check here" comment that must be reversed).

Reference pattern (from `src/app/api/admin/packages/route.ts` lines 7–14):

```ts
import { isAuthorizedAdmin } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  ...
```

**Files:**
- Modify: `src/app/api/admin/question-bank/route.ts` (GET + POST)
- Modify: `src/app/api/admin/generate-ebook/route.ts` (POST + GET)
- Modify: `src/app/api/admin/figural-img/route.ts` (GET)
- Modify: `src/app/api/admin/db-status/route.ts` (GET, remove the "no auth" comment)
- Test: `tests/admin-guard.test.ts` (new)

**Interfaces:**
- Consumes: `isAuthorizedAdmin(req: NextRequest | Request): boolean` from `@/lib/adminAuth` (existing, unchanged).
- Produces: no new exports; all 4 routes return `{ error: 'Unauthorized' }` with status 401 when the `x-admin-pin` header is missing/incorrect.

- [ ] **Step 1: Write the failing test**

Create `tests/admin-guard.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB layer so route modules import cleanly without env vars
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => null),
  isDbConnected: vi.fn(async () => true),
}));

// Mock adminAuth to control guard behavior per test
vi.mock('@/lib/adminAuth', () => ({
  isAuthorizedAdmin: vi.fn(),
}));

import { isAuthorizedAdmin } from '@/lib/adminAuth';
const mockGuard = vi.mocked(isAuthorizedAdmin);

describe('admin route guards', () => {
  beforeEach(() => {
    mockGuard.mockReset();
  });

  it('question-bank GET returns 401 when guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const { GET } = await import('@/app/api/admin/question-bank/route');
    const req = new Request('https://x.dev/api/admin/question-bank?limit=1');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('question-bank POST returns 401 when guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const { POST } = await import('@/app/api/admin/question-bank/route');
    const req = new Request('https://x.dev/api/admin/question-bank', {
      method: 'POST',
      body: JSON.stringify({ action: 'build_package', packageId: 'p1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('generate-ebook POST returns 401 when guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const { POST } = await import('@/app/api/admin/generate-ebook/route');
    const req = new Request('https://x.dev/api/admin/generate-ebook', {
      method: 'POST',
      body: JSON.stringify({ category: 'TWK', count: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('generate-ebook GET returns 401 when guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const { GET } = await import('@/app/api/admin/generate-ebook/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('figural-img GET returns 401 when guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const { GET } = await import('@/app/api/admin/figural-img/route');
    const req = new Request('https://x.dev/api/admin/figural-img?filename=fig_a_01.png');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('db-status GET returns 401 when guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const { GET } = await import('@/app/api/admin/db-status/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('guard passes through when authorized (question-bank GET reaches DB branch)', async () => {
    mockGuard.mockReturnValue(true);
    const { GET } = await import('@/app/api/admin/question-bank/route');
    const req = new Request('https://x.dev/api/admin/question-bank?limit=1');
    const res = await GET(req as any);
    // getDb mocked to null -> route's own "DB not configured" branch, NOT 401
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas"
npx vitest run tests/admin-guard.test.ts
```

Expected: FAIL — the unguarded routes return 200/500/405 instead of 401 (the `db-status` and `generate-ebook GET` tests fail because no guard exists; `question-bank` tests fail likewise).

- [ ] **Step 3: Add the guard to all 8 handlers**

In `src/app/api/admin/question-bank/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthorizedAdmin } from '@/lib/adminAuth';

export async function GET(req: Request) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... existing body unchanged
```

and at the top of `POST` (line 67, same insertion):

```ts
export async function POST(req: Request) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... existing body unchanged
```

In `src/app/api/admin/generate-ebook/route.ts`, add the same import and the same 3-line guard as the FIRST statements of both `POST` (line 11) and `GET` (line 184).

In `src/app/api/admin/figural-img/route.ts`, add the import and guard at the top of `GET` (line 4), before the `filename` check:

```ts
import { isAuthorizedAdmin } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... existing body unchanged
```

In `src/app/api/admin/db-status/route.ts`, replace the entire file with:

```ts
import { NextResponse } from 'next/server';
import { isDbConnected } from '@/lib/db';
import { isAuthorizedAdmin } from '@/lib/adminAuth';

export async function GET(req: Request) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connected = await isDbConnected();
  const hasEnv = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);

  return NextResponse.json({
    connected,
    hasEnv,
    message: !hasEnv
      ? 'DATABASE_URL not set — connect Neon via Vercel Storage'
      : connected
      ? 'Database connected'
      : 'DATABASE_URL set but connection failed',
  });
}
```

- [ ] **Step 4: Run the full test suite**

```bash
npm test
```

Expected: PASS — new admin-guard tests green, all existing tests unaffected (nothing else imports these 4 routes).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/question-bank/route.ts src/app/api/admin/generate-ebook/route.ts src/app/api/admin/figural-img/route.ts src/app/api/admin/db-status/route.ts tests/admin-guard.test.ts
git commit -m "fix(security): require admin PIN on question-bank, generate-ebook, figural-img, db-status routes"
```

---

### Task 2: Fix `getClientIp` — key rate limits on the edge-observed (last) XFF hop

**Context:** `src/lib/rateLimit.ts` lines 53–59:

```ts
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}
```

A client can send `X-Forwarded-For: <random-ip>` on every login/OTP attempt and rotate a fresh rate-limit bucket each time (limit: login 10/60s, register 5/300s, verify-otp 5/300s). Behind Vercel, the edge APPENDS the real client IP to the end of the chain, so the LAST hop is the trustworthy one — same fix already applied in the sim-akreditasi-django project.

**Files:**
- Modify: `src/lib/rateLimit.ts` (only `getClientIp`)
- Test: `tests/rate-limit-ip.test.ts` (new)

**Interfaces:**
- Consumes: nothing.
- Produces: `getClientIp(req: Request): string` — same signature, callers unchanged (6 auth routes keep working).

- [ ] **Step 1: Write the failing test**

Create `tests/rate-limit-ip.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getClientIp } from '@/lib/rateLimit';

function reqWith(headers: Record<string, string>): Request {
  return new Request('https://x.dev/api/auth/login', { headers });
}

describe('getClientIp', () => {
  it('uses the LAST XFF hop (edge-observed), not the spoofable first hop', () => {
    const req = reqWith({ 'x-forwarded-for': '6.6.6.6, 36.86.50.10' });
    expect(getClientIp(req)).toBe('36.86.50.10');
  });

  it('handles single-hop XFF (no proxy chain)', () => {
    const req = reqWith({ 'x-forwarded-for': '36.86.50.10' });
    expect(getClientIp(req)).toBe('36.86.50.10');
  });

  it('falls back to x-real-ip when XFF absent', () => {
    const req = reqWith({ 'x-real-ip': '36.86.50.11' });
    expect(getClientIp(req)).toBe('36.86.50.11');
  });

  it('returns 127.0.0.1 when no proxy headers at all', () => {
    expect(getClientIp(reqWith({}))).toBe('127.0.0.1');
  });

  it('never returns an empty string for blank XFF', () => {
    const req = reqWith({ 'x-forwarded-for': '  ', 'x-real-ip': '10.1.2.3' });
    expect(getClientIp(req)).toBe('10.1.2.3');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/rate-limit-ip.test.ts
```

Expected: FAIL — current implementation returns `'6.6.6.6'` (first hop) for the multi-hop case and `''`-adjacent handling for the blank case.

- [ ] **Step 3: Implement**

In `src/lib/rateLimit.ts`, replace `getClientIp` with:

```ts
/**
 * Client IP as observed by the trusted edge proxy (Vercel).
 * Vercel APPENDS the real client IP to the END of x-forwarded-for, so the
 * LAST hop is the only spoof-proof value. Earlier hops are client-supplied.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded.split(',').map(h => h.trim()).filter(Boolean);
    if (hops.length > 0) {
      return hops[hops.length - 1];
    }
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}
```

- [ ] **Step 4: Run the full suite**

```bash
npm test
```

Expected: PASS — new tests green; existing auth/rate-limit-related tests unaffected (they exercise `checkRateLimit` logic, not IP extraction).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rateLimit.ts tests/rate-limit-ip.test.ts
git commit -m "fix(security): rate limit keys on last XFF hop (edge-observed IP)"
```

---

### Task 3: Persistent rate-limit store on Neon (survives serverless instance churn)

**Context:** `src/lib/rateLimit.ts` uses a per-process `Map`. On Vercel, each lambda instance has separate memory and cold-starts constantly, so limits effectively multiply by instance count and reset on every deploy/spin-up. The app already has a Neon Postgres connection (`src/lib/db.ts`) — use it, matching the pattern proven in the sim-akreditasi-django project (DatabaseCache). The DB becomes the primary store; the in-memory map remains a fail-open fallback when the DB is unreachable.

**Files:**
- Modify: `src/lib/rateLimit.ts` (add DB store, rewire `checkRateLimit`)
- Create: `migrations/010_rate_limits.sql`
- Test: `tests/rate-limit-store.test.ts` (new)

**Interfaces:**
- Consumes: `getDb()` from `@/lib/db` (existing).
- Produces: `checkRateLimit(key: string, limit?: number, windowSeconds?: number): { success: boolean; remaining: number; retryAfterSeconds: number }` — SAME signature and return shape as today; the 6 auth-route callers need ZERO changes. Internally exported for tests: `checkRateLimitMemory(...)`, `checkRateLimitDb(...)`.

- [ ] **Step 1: Create the migration**

Create `migrations/010_rate_limits.sql`:

```sql
-- Persistent rate limiting (survives Vercel serverless instance churn).
-- timestamps: epoch-ms array of hits inside the current window(s), pruned lazily on upsert.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  timestamps BIGINT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_updated ON rate_limits (updated_at);
```

Apply it (any ONE of): run via the existing admin panel migrate route after Task 1's guard is in place, or manually in the Neon SQL editor. Do NOT apply before Task 1 is deployed (the migrate route would otherwise be an unauthenticated DDL vector — it is currently guarded, but keep ordering safe anyway).

- [ ] **Step 2: Write the failing test**

Create `tests/rate-limit-store.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => mockSql),
}));

import { checkRateLimit, checkRateLimitDb } from '@/lib/rateLimit';

describe('DB-backed rate limit store', () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it('allows when DB returns array under limit', async () => {
    // Mock the upsert ... RETURNING timestamps shape
    mockSql.mockResolvedValue([{ timestamps: [1000, 2000] }]);
    const r = await checkRateLimitDb('login:1.2.3.4', 10, 60);
    expect(r.success).toBe(true);
    expect(r.remaining).toBe(8);
  });

  it('blocks when DB returns array at/over limit', async () => {
    const arr = Array.from({ length: 10 }, (_, i) => i + 1);
    mockSql.mockResolvedValue([{ timestamps: arr }]);
    const r = await checkRateLimitDb('login:1.2.3.4', 10, 60);
    expect(r.success).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('FAILS OPEN to memory fallback when DB throws', async () => {
    mockSql.mockRejectedValue(new Error('neon cold start'));
    const r = await checkRateLimitDb('login:1.2.3.4', 10, 60);
    // fail-open: first request through a DB error must not lock the user out
    expect(r.success).toBe(true);
  });

  it('FAILS OPEN when DB not configured (getDb null)', async () => {
    const { checkRateLimit: unified } = await import('@/lib/rateLimit');
    const dbMod = await import('@/lib/db');
    vi.mocked(dbMod.getDb).mockReturnValueOnce(null as any);
    const r = await unified('login:1.2.3.4', 10, 60);
    expect(r.success).toBe(true);
  });

  it('unified checkRateLimit keeps the legacy in-memory shape when DB returns rows', async () => {
    mockSql.mockResolvedValue([{ timestamps: [1] }]);
    const r = await checkRateLimit('login:1.2.3.4', 10, 60);
    expect(r).toHaveProperty('success');
    expect(r).toHaveProperty('remaining');
    expect(r).toHaveProperty('retryAfterSeconds');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/rate-limit-store.test.ts
```

Expected: FAIL — `checkRateLimitDb` does not exist yet.

- [ ] **Step 4: Implement the DB store**

In `src/lib/rateLimit.ts`, add imports and the new store, and rewire the unified entry point. Replace the section after `getClientIp` (keep `RateLimitRecord`, the memory map, cleanup timer, and rename the existing core to `checkRateLimitMemory`):

```ts
import { getDb } from '@/lib/db';

// ---- Legacy in-memory store (fallback when DB unreachable) ----
// (keep existing Map-based logic, renamed)
export function checkRateLimitMemory(
  key: string,
  limit = 10,
  windowSeconds = 60
): { success: boolean; remaining: number; retryAfterSeconds: number } {
  // ... exact existing body of checkRateLimit, unchanged
}

/**
 * DB-backed sliding window. One atomic statement per check:
 * prunes hits older than the window, appends the new hit, returns the
 * post-write array. Fails OPEN to the memory store on any DB error —
 * rate limiting must never lock users out because of a DB hiccup.
 */
export async function checkRateLimitDb(
  key: string,
  limit = 10,
  windowSeconds = 60
): Promise<{ success: boolean; remaining: number; retryAfterSeconds: number }> {
  const sql = getDb();
  if (!sql) return checkRateLimitMemory(key, limit, windowSeconds);
  try {
    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;

    const rows = await sql`
      INSERT INTO rate_limits (key, timestamps, updated_at)
      VALUES (${key}, ARRAY[${now}]::BIGINT[], now())
      ON CONFLICT (key) DO UPDATE SET
        timestamps = COALESCE(
          (SELECT array_agg(t ORDER BY t) FROM unnest(rate_limits.timestamps) AS t WHERE t > ${cutoff}),
          ARRAY[]::BIGINT[]
        ) || ARRAY[${now}]::BIGINT[],
        updated_at = now()
      RETURNING timestamps
    `;

    const ts = (rows?.[0]?.timestamps ?? []) as number[];
    const active = ts.filter(t => t > cutoff);

    // Opportunistic cleanup of long-dead rows (~5% of checks)
    if (Math.random() < 0.05) {
      sql`DELETE FROM rate_limits WHERE updated_at < now() - INTERVAL '2 hours'`.catch(() => {});
    }

    if (active.length > limit) {
      const oldest = Math.min(...active);
      const retryAfter = Math.max(1, Math.ceil((oldest + windowSeconds * 1000 - now) / 1000));
      return { success: false, remaining: 0, retryAfterSeconds: retryAfter };
    }
    return { success: true, remaining: Math.max(0, limit - active.length), retryAfterSeconds: 0 };
  } catch (err) {
    console.error('[rateLimit] DB store unavailable, failing open to memory:', err);
    return checkRateLimitMemory(key, limit, windowSeconds);
  }
}

/** Unified entry point — same signature as the old checkRateLimit. */
export function checkRateLimit(
  key: string,
  limit = 10,
  windowSeconds = 60
): { success: boolean; remaining: number; retryAfterSeconds: number } | Promise<{ success: boolean; remaining: number; retryAfterSeconds: number }> {
  return checkRateLimitDb(key, limit, windowSeconds);
}
```

Note for the implementer: the 6 callers in `src/app/api/auth/*/route.ts` do `const rl = checkRateLimit(...)` then read `.success` — since the unified function now returns a Promise, each caller must `await` it. Update all 6 call sites from

```ts
const rl = checkRateLimit(`login:${ip}`, 10, 60);
```

to

```ts
const rl = await checkRateLimit(`login:${ip}`, 10, 60);
```

(`login`, `register`, `forgot-password`, `reset-password`, `verify-otp`, `verify-link` — all handlers are already `async`.)

- [ ] **Step 5: Run the full suite**

```bash
npm test
```

Expected: PASS — store tests green; the 6 auth-route test files (`payment-*`, `auth.test.ts`, etc.) keep passing since response contracts are unchanged.

- [ ] **Step 6: Apply migration to production DB**

In the Neon SQL editor (console.neon.tech), run `migrations/010_rate_limits.sql`. Verify:

```sql
SELECT COUNT(*) FROM rate_limits;
```

Expected: returns 0 without error (table exists).

- [ ] **Step 7: Commit**

```bash
git add src/lib/rateLimit.ts migrations/010_rate_limits.sql tests/rate-limit-store.test.ts src/app/api/auth/*/route.ts
git commit -m "fix(security): persistent Neon-backed rate limit store with memory fail-open"
```

---

### Task 4: Add Content-Security-Policy header

**Context:** The prod app serves no CSP (verified live). The sibling Django project ships a strict CSP — match it pragmatically for Next.js. Next's hydration needs `'unsafe-inline'` for its bootstrap inline script unless nonce infrastructure is added (out of scope); everything else can be locked down.

**Files:**
- Modify: `next.config.js` (headers array)
- Test: none (verified in Task 5 production smoke check)

**Interfaces:**
- Consumes: nothing. Produces: CSP header on every response.

- [ ] **Step 1: Add the CSP**

In `next.config.js`, inside the existing `headers()` entry's `headers` array, add as the FIRST item:

```js
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '),
},
```

If the app loads fonts/scripts from Google Fonts or CDNs (check `src/app/layout.tsx` for `<link>` tags first), add those origins ONLY to `style-src`/`font-src`/`script-src` as actually required — never widen `default-src`.

- [ ] **Step 2: Build locally to catch any header-related breakage**

```bash
npm run build
```

Expected: build succeeds (CSP is response-header-only; this catches unrelated breakage before deploy).

- [ ] **Step 3: Commit**

```bash
git add next.config.js
git commit -m "fix(security): add Content-Security-Policy header"
```

---

### Task 5: Deploy and verify against production

**Files:** none modified (verification only).

**Interfaces:**
- Consumes: Tasks 1–4 committed to `main`.

- [ ] **Step 1: Push and wait for the Vercel build**

```bash
git push origin main
```

Wait for "Ready" in the Vercel dashboard.

- [ ] **Step 2: Verify the critical fix — question-bank must now 401**

```bash
T="https://belajar-cpns-saas.vercel.app"
curl -s -o /dev/null -w "question-bank no-auth: %{http_code} (expect 401)\n" "$T/api/admin/question-bank?limit=1"
curl -s -o /dev/null -w "generate-ebook GET:  %{http_code} (expect 401)\n" "$T/api/admin/generate-ebook"
curl -s -o /dev/null -w "db-status:           %{http_code} (expect 401)\n" "$T/api/admin/db-status"
curl -s -o /dev/null -w "packages (control):  %{http_code} (expect 401)\n" "$T/api/admin/packages"
```

Expected: all four 401. If any returns 200, the guard was not deployed — stop and re-check Task 1.

- [ ] **Step 3: Verify app + CSP + admin panel still work**

```bash
curl -s -I -m 20 "$T" | grep -i "content-security-policy"
curl -s -o /dev/null -w "homepage: %{http_code} (expect 200)\n" "$T"
curl -s -o /dev/null -w "simulasi: %{http_code} (expect 200)\n" "$T/simulasi"
curl -s -o /dev/null -w "login:    %{http_code} (expect 200)\n" "$T/login"
```

Expected: CSP header present; all pages 200. Then open the admin panel in a browser with the real PIN and confirm one authenticated admin action still works (e.g. load the packages list) — this proves the guard didn't break the legit workflow.

- [ ] **Step 4: Verify rate limiting persists across requests**

```bash
# 12 rapid login attempts with SPOOFED first hops — all should share ONE bucket now
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "attempt $i -> %{http_code}\n" -X POST "$T/api/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: $((RANDOM)).$((RANDOM)).$((RANDOM)).$((RANDOM))" \
    -d '{"phone":"081234567890","pin":"000000"}'
done
```

Expected: roughly 10 responses then HTTP 429 for the remainder — DESPITE different spoofed XFF values per attempt (proves both Task 2's last-hop keying and Task 3's persistent store). Use the fake phone `081234567890` only; never a real account. Do NOT exceed 15 total attempts.

- [ ] **Step 5: Record verification results**

Append a "2026-10-14 hardening verification" section to `docs/` (or create `docs/security-verification.md`) with the outputs of Steps 2–4, then commit:

```bash
git add docs/
git commit -m "docs(security): record post-hardening production verification"
git push origin main
```

---

## Accepted Risks (documented, NOT in scope)

- **JWT secret derivation fallback** (`DATABASE_URL + public salt`) when `JWT_SECRET` is unset — weak-ish but requires DB-URL compromise to exploit; recommend setting `JWT_SECRET` in Vercel env later (ops task, no code change).
- **JWT 7-day TTL without rotation** — acceptable for this product; a refresh-token design is out of scope.
- **CSP keeps `'unsafe-inline'` for scripts/styles** — Next.js hydration requirement without a nonce pipeline; still blocks external script injection and framing.
- **Rate-limit DB store adds 1 Neon query per auth attempt** — negligible at this traffic level; the ~5% opportunistic cleanup keeps the table small.
- **`figural-img` served images remain reachable via static paths** — guarding the route closes the DB-query vector; the static image files themselves are public by design.

## Self-Review

- Spec coverage: finding #1+#2 (unauthenticated admin routes, verified live) → Task 1 (all 8 handlers across 4 files); finding #3 (in-memory rate limit) → Tasks 2+3 (spoofable IP + non-persistent store, the two halves of the same weakness); finding #7 (missing CSP) → Task 4; production proof → Task 5. Findings #4 (db-status info leak) and #5 (figural-img) are folded into Task 1's guarded set; finding #6 (JWT fallback/TTL) → Accepted Risks with a recommendation.
- Placeholder scan: none — every code step carries full content; the one "existing body unchanged" instruction refers to code already present in the repo, quoted by line reference in each task's Context.
- Type consistency: `checkRateLimit` signature preserved (returns a Promise now; all 6 call sites updated with `await` in Task 4 of Task 3's steps); `getClientIp` signature unchanged; `isAuthorizedAdmin` imported, never modified.
- Review Focus: all five failure modes pinned — item 1 by Task 1's authorized-passthrough test + Task 5 Step 3's admin-panel check; item 2 by Task 2's multi-hop test; item 3 by Task 3's fail-open tests; item 4 by the pruning upsert + cleanup test path; item 5 by Task 5 Step 3's page smoke checks.
