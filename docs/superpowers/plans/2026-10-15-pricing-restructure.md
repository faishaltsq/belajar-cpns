# Lolos.in Pricing Restructure & PRO Value Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Lolos.in's paid tiers economically coherent by moving price authority to the server, repositioning PRO's price against its real break-even, adding a mid-tier bundle, and giving PRO one genuinely exclusive feature instead of re-labelling free ones.

**Architecture:** Pricing becomes a single server-owned module (`src/lib/pricing.ts`) that every payment route reads. The client stops sending `baseAmount` entirely — it only ever sends `orderType` and, for bundles, `packageIds`. A third `order_type` value (`bundle`) is added to `payment_orders.order_type`, which is `varchar` with no CHECK constraint (verified against production), so no column migration is required for the type itself; a separate additive migration adds `package_ids jsonb`. PRO's exclusive surface is a wrong-answer recap computed from `exam_results.answers` joined against `questions` — data that already exists in production.

**Tech Stack:** Next.js 14 App Router, TypeScript, Neon serverless Postgres (tagged templates), KlikQRIS, Vitest.

**Spec:** No separate spec document. The analysis this plan argues from is recorded in `## Findings` below; executors should read it alongside the tasks.

## Findings

Verified against production (`lolosin.com`, project `prj_5Aow4aRugEHKXcgLDYA6w9zTZUoq`) on 2026-10-15.

1. **`baseAmount` is client-controlled — CRITICAL.** `src/app/api/payment/create-order/route.ts:14-19` reads `body.baseAmount || <env fallback>`. Any caller can post `{"orderType":"pro","baseAmount":1}` and be charged Rp 1. Production confirms this is live: **all 6 paid orders have `base_amount = 1000`**, while the UI advertises Rp 5.000 / Rp 150.000. Not one paid order matches its own price tag.
2. **Price env vars are unset in Vercel.** `KLIKQRIS_PRO_PRICE`, `KLIKQRIS_TRYOUT_PRICE`, `SAWERIA_PRO_PRICE`, `SAWERIA_TRYOUT_PRICE` do not exist in the project env (full env listing returned 29 keys, `hiddenProductionEnvCount: 0`). Server falls through to hardcoded 5000/150000 — and even those are bypassed by finding 1.
3. **PRO's break-even is unreachable.** `TOTAL_TRYOUT_PACKAGES = 37`, `FREE_IDS = {tryout-mini, tryout-1, tryout-2}` → 34 paid packages. PRO Rp 150.000 ÷ Rp 5.000 = **30 packages**. Buying every package individually costs 34 × 5.000 = Rp 170.000, so PRO's absolute maximum saving is **Rp 20.000 (11.8%)**. A realistic candidate completes 5–15 tryouts; below 30, PRO is strictly worse.
4. **PRO has no exclusive feature.** Grepping every use of `is_pro`: `src/app/simulasi/page.tsx:128` (`const isLocked = !isPro && !FREE_IDS.has(pkg.id) && !unlockedPackages.includes(pkg.id)`), `src/components/UpgradeProModal.tsx:112,147`, plus write-sites in webhook/sync/status/profile/history/create-order. That is the **only** gating check in the app. PRO = "all packages unlocked", nothing more. Meanwhile `UpgradeProModal.tsx:355` claims *"Bank Soal 300+ & fitur drill subkategori lengkap"* as a PRO benefit — `/drill/[category]/[subCategory]` never checks `is_pro`, so it is a free feature sold as paid. `UpgradeProModal.tsx:378` lists *"Analitik skor dan leaderboard nasional"* under the **single** column, also ungated.
5. **The two fulfilment paths disagree — CRITICAL for bundle.** `src/app/api/webhooks/klikqris/route.ts:86-106` grants PRO only on `order_type === 'pro'` and appends only on `'single'`; any other value grants **nothing** (silent success). `src/app/api/payment/sync/route.ts:62-78` does `if (single && package_id) {...} else { is_pro = TRUE }` — any other value grants **full PRO**. Adding `bundle` to the current code would grant PRO on manual sync and nothing on webhook.
6. **Conversion, not tier structure, is the dominant problem.** 71 orders total: 65 expired, **6 paid (8.5%)**. `pro`: 37 orders → 2 paid. `single`: 34 orders → 4 paid. 4 registered users total. Rp 150.000 → Rp 59.000 will not fix a 91.5% expiry rate on its own.
7. **DB shape.** `payment_orders.order_type` is `character varying`, default `'pro'`, **no CHECK constraint, no enum type** — a third value needs no type migration. `payment_orders` has no DDL in `migrations/` (created out-of-band). `users.unlocked_packages` is `jsonb`. `exam_results.answers` is `jsonb` keyed by question **number as string** → option letter (`{"1":"D"}`); 5 of 8 rows have answers. `questions`: 3898 rows, 3196 have `correct_answer`, 495 have `tkp_scores`.

8. **`options[].score` — not `correct_answer` — is the grading source.** Verified against production. `src/lib/diagnostic.ts:38-50` and `src/components/ExamQuestionReview.tsx:52-53` both grade with `maxScore = Math.max(...q.options.map(o => o.score ?? 0))` and compare the chosen option's score against it. `correct_answer` is a denormalized convenience column, regenerated from `options` in `src/app/api/admin/generate-custom/route.ts:94-96`. Coverage in production:
   - `options[].score > 0` present in **3852 / 3898** rows — only `tryout-figural` (46 rows) has zero.
   - `correct_answer` present in **3196 / 3898** — **`tryout-mini`, `tryout-1` through `tryout-6` are 100% null** (690 rows, 4 of those 6 packages are paid).
   - A recap built on `correct_answer` alone would silently return **zero items** for 6 of 37 packages. Using `correct_answer ?? max-score option id` covers all 3898.

## Global Constraints

- Do not modify `isAuthorizedAdmin` in `src/lib/adminAuth.ts`.
- All DB access via Neon tagged templates (`sql\`...\``). No string concatenation of SQL.
- Credentials, tokens, connection strings, secrets must never be printed, logged, or committed. Replace with `[REDACTED]`.
- `@phosphor-icons/react` only. `lucide-react` is forbidden.
- No emoji in simulation/filter UI elements.
- Light mode only, Claude Amber theme (`#faf9f5`, `#c96442`, Outfit font), text-only "Lolos.in" logo.
- No third-party payment gateway identity shown in UI (white-label). No BKN or Garuda official logos, no claims of leaked official questions, no claim of being an official organiser, no overclaiming government legality.
- Storage isolation: user-scoped keys are `lolos_u_<userId>_<feature>` / `lolos_guest_<feature>`.
- Deployment target is Vercel only.
- TDD: write the failing test first, run it, see it fail, then implement.
- Conventional Commits: `fix(...)`, `feat(...)`, `docs(...)`.
- Plans and code comments in English.

## Review Focus

- **A client posts `{"orderType":"pro","baseAmount":1}`.** Expected: the order is created at the server's PRO price, not Rp 1. Most likely to bite — this is live in production right now and every revenue number downstream is corrupted by it. Test: Task 0.1.
- **A client posts an unknown `orderType` (e.g. `"admin"`, `"free"`).** Expected: rejected with 400, never silently coerced to `pro` (today `body.orderType === 'single' ? 'single' : 'pro'` coerces everything non-single to pro). Test: Task 0.2.
- **A bundle order is fulfilled via the webhook path.** Expected: all selected packages appended to `unlocked_packages`, `is_pro` stays false. Most likely to bite because the webhook and sync paths currently behave oppositely (Finding 5). Test: Task 3.4.
- **A bundle order is fulfilled via `/api/payment/sync`.** Expected: same as webhook — packages appended, `is_pro` false. Current `else` branch would grant full PRO for the bundle price. Test: Task 3.4.
- **A user already has some of the bundle's packages unlocked.** Expected: order rejected or prorated — never charged for packages they own. Test: Task 3.3.
- **A non-PRO user hits `/api/pro/recap`.** Expected: 403 with a clear error, no data leak. Test: Task 2.2.
- **A PRO user has zero completed exams.** Expected: 200 with an empty recap, not a 500. Test: Task 2.2.
- **A TKP question with `correct_answer = null` but a 1–5 `options` score ladder.** Expected: graded by the max-score option, not skipped. `tryout-1..6` are 100% null on `correct_answer`, so a recap keyed on that column returns zero items for 6 of 37 packages. Test: Task 2.1.
- **A tie on max option score with `correct_answer = null`.** Expected: skipped as ungradeable, never guessed. Test: Task 2.1.

---

# Phase 0 — Server-Side Price Authority (blocks everything else)

Findings 1 and 2 mean no repricing work is meaningful until the server owns the price. This phase ships independently and fixes a live vulnerability.

### Task 0.1: Create the pricing module

**Files:**
- Create: `src/lib/pricing.ts`
- Test: `tests/pricing.test.ts`

**Interfaces:**
- Produces: `OrderType` = `'single' | 'bundle' | 'pro'`; `PRICE_TABLE: Record<OrderType, number>`; `priceFor(orderType: OrderType): number`; `isOrderType(v: unknown): v is OrderType`. Task 0.2, 3.2, 3.3 consume these.

- [ ] **Step 1: Write the failing test**

```ts
// tests/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { priceFor, isOrderType, PRICE_TABLE } from '@/lib/pricing';

describe('pricing module', () => {
  it('returns server-authoritative prices that ignore client input', () => {
    expect(priceFor('single')).toBe(5000);
    expect(priceFor('pro')).toBe(59000);
    expect(priceFor('bundle')).toBe(18000);
  });

  it('rejects unknown order types', () => {
    expect(isOrderType('single')).toBe(true);
    expect(isOrderType('pro')).toBe(true);
    expect(isOrderType('bundle')).toBe(true);
    expect(isOrderType('free')).toBe(false);
    expect(isOrderType('admin')).toBe(false);
    expect(isOrderType(undefined)).toBe(false);
    expect(isOrderType(42)).toBe(false);
  });

  it('makes PRO cheaper than buying all 34 paid packages individually', () => {
    const allSatuan = 34 * PRICE_TABLE.single;
    expect(PRICE_TABLE.pro).toBeLessThan(allSatuan);
    // break-even at 12 packages or fewer
    expect(Math.ceil(PRICE_TABLE.pro / PRICE_TABLE.single)).toBeLessThanOrEqual(12);
  });

  it('prices bundle between single and pro', () => {
    expect(PRICE_TABLE.single).toBeLessThan(PRICE_TABLE.bundle);
    expect(PRICE_TABLE.bundle).toBeLessThan(PRICE_TABLE.pro);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pricing.test.ts`
Expected: FAIL — `@/lib/pricing` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/pricing.ts
export type OrderType = 'single' | 'bundle' | 'pro';

/**
 * Server-authoritative price table. The client never supplies an amount —
 * create-order reads only this table (see Findings 1).
 *
 * Env overrides exist so price can change without a redeploy, but an unset or
 * malformed value falls back to the literal below rather than to zero.
 */
export const PRICE_TABLE: Record<OrderType, number> = {
  single: readPrice('KLIKQRIS_TRYOUT_PRICE', 5000),
  bundle: readPrice('KLIKQRIS_BUNDLE_PRICE', 18000),
  pro: readPrice('KLIKQRIS_PRO_PRICE', 59000),
};

function readPrice(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function priceFor(orderType: OrderType): number {
  return PRICE_TABLE[orderType];
}

export function isOrderType(v: unknown): v is OrderType {
  return v === 'single' || v === 'bundle' || v === 'pro';
}
```

Note the deliberate rename: these keys read `KLIKQRIS_*` so they match what Finding 2 says does not yet exist in Vercel — Task 0.4 sets them.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pricing.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing.ts tests/pricing.test.ts
git commit -m "feat(pricing): add server-authoritative price table module"
```

---

### Task 0.2: Make create-order reject unknown order types and ignore client prices

**Files:**
- Modify: `src/app/api/payment/create-order/route.ts:10-19`
- Test: `tests/price-authority.test.ts`

**Interfaces:**
- Consumes: `isOrderType`, `priceFor`, `OrderType` from Task 0.1.
- Produces: POST `/api/payment/create-order` accepts `{ orderType, packageId? }` only. `body.baseAmount` is ignored entirely.

- [ ] **Step 1: Write the failing test**

```ts
// tests/price-authority.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => mockSql }));

const mockCookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({ cookies: () => mockCookieStore }));

const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({ verifyToken: (...a: any[]) => mockVerifyToken(...a) }));

const mockCreateKlikQris = vi.fn();
vi.mock('@/lib/klikqris', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/klikqris')>();
  return { ...actual, createKlikQrisTransaction: (...a: any[]) => mockCreateKlikQris(...a) };
});

import { POST as createOrder } from '@/app/api/payment/create-order/route';

function req(body: object) {
  return new NextRequest('http://localhost:3000/api/payment/create-order', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockCookieStore.get.mockReturnValue(null);
  mockVerifyToken.mockResolvedValue(null);
});

describe('create-order price authority', () => {
  it('ignores a client-supplied baseAmount and uses the PRO table price', async () => {
    mockSql
      .mockResolvedValueOnce([])   // existing pending orders
      .mockResolvedValueOnce([{ id: 901 }]); // INSERT RETURNING id
    mockSql.mockResolvedValueOnce([]);       // UPDATE after gateway
    mockCreateKlikQris.mockResolvedValueOnce({
      success: true, orderId: 'INV-901', uniqueCode: 7,
      totalAmount: 59007, qrisUrl: 'https://x/q.png', qrisImage: 'data:image/png;base64,q',
      signature: 'sig',
    });

    const res = await createOrder(req({ orderType: 'pro', baseAmount: 1 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.baseAmount).toBe(59000);
    // amount handed to the gateway must also be the table price
    expect(mockCreateKlikQris).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 59000 })
    );
    // and the row inserted must carry 59000, not 1
    expect(JSON.stringify(mockSql.mock.calls)).toContain('59000');
  });

  it('rejects an unknown orderType with 400 instead of coercing to pro', async () => {
    const res = await createOrder(req({ orderType: 'free' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/orderType/i);
  });

  it('rejects a single order whose packageId is already unlocked', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'tok' });
    mockVerifyToken.mockResolvedValue({ userId: 'u-1', email: 'a@b.c' });
    mockSql.mockResolvedValueOnce([{ is_pro: false, unlocked_packages: ['tryout-8'] }]);

    const res = await createOrder(req({ orderType: 'single', packageId: 'tryout-8' }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('ALREADY_UNLOCKED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/price-authority.test.ts`
Expected: FAIL — first test gets `baseAmount: 1` (client wins), second gets 200 (coerced to pro).

- [ ] **Step 3: Implement**

Replace lines 10-19 of `src/app/api/payment/create-order/route.ts`:

```ts
    // orderType is validated, never coerced. Unknown values are rejected so a
    // caller cannot ride a typo into a higher-privilege tier (Findings 1).
    const orderType = isOrderType(body.orderType) ? body.orderType : null;
    if (!orderType) {
      return NextResponse.json(
        { error: 'INVALID_ORDERTYPE', message: 'orderType harus salah satu dari: single, bundle, pro.' },
        { status: 400 }
      );
    }
    const packageId = body.packageId ? String(body.packageId).trim() : null;

    // Price comes from the server table only. body.baseAmount is deliberately
    // not read — clients must not be able to set the amount (Finding 1).
    const baseAmount = priceFor(orderType);
```

Add the import at the top of that file:

```ts
import { priceFor, isOrderType } from '@/lib/pricing';
```

- [ ] **Step 4: Run new test to verify it passes**

Run: `npx vitest run tests/price-authority.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the existing payment suite for regressions**

Run: `npx vitest run tests/qa-agent-payment.test.ts`
Expected: PASS. If any existing test asserts `baseAmount` echoed from the request body, update that assertion to the table price — the old behaviour was the bug.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pricing.ts src/app/api/payment/create-order/route.ts tests/price-authority.test.ts tests/qa-agent-payment.test.ts
git commit -m "fix(payment): move price authority to server and reject unknown orderType"
```

---

### Task 0.3: Stop the client from sending prices

**Files:**
- Modify: `src/components/UpgradeProModal.tsx:70-74`
- Modify: `src/components/UpgradeProModal.tsx:415`

**Interfaces:**
- Consumes: POST `/api/payment/create-order` from Task 0.2 (accepts `{ orderType, packageId? }`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/price-authority.test.ts  (append to the existing file)
describe('client no longer sends prices', () => {
  it('UpgradeProModal request body contains no amount field', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/components/UpgradeProModal.tsx'),
      'utf8'
    );
    const bodyBlock = src.slice(src.indexOf('body: JSON.stringify'), src.indexOf('}),\n      });'));
    expect(bodyBlock).not.toMatch(/baseAmount/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/price-authority.test.ts`
Expected: FAIL — `baseAmount: plan === 'single' ? 5000 : 150000` still present at line 73.

- [ ] **Step 3: Implement**

Replace lines 70-74:

```ts
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: plan,
          packageId: plan === 'single' ? packageId : undefined,
        }),
```

Then make the pay button read its amount from the response instead of a literal, so UI and server can never disagree:

```tsx
                <QrCode size={18} weight="bold" />
                Bayar Rp {(orderInfo?.baseAmount ?? 0).toLocaleString('id-ID')} via QRIS
                <ArrowRight size={14} weight="bold" />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/price-authority.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/UpgradeProModal.tsx tests/price-authority.test.ts
git commit -m "fix(payment): stop client from supplying order amounts"
```

---

### Task 0.4: Set the price env vars in Vercel

**Files:**
- None (dashboard action)

**Interfaces:**
- Consumes: `PRICE_TABLE` env keys from Task 0.1.

- [ ] **Step 1: Set production env vars**

Via `vercel env` or dashboard, target `production`:

```
KLIKQRIS_TRYOUT_PRICE=5000
KLIKQRIS_BUNDLE_PRICE=18000
KLIKQRIS_PRO_PRICE=59000
```

Never print the values of any other env var. Never echo `DATABASE_URL`, `ADMIN_PIN`, `KLIKQRIS_API_KEY` or `JWT_SECRET` into any file or log.

- [ ] **Step 2: Verify they resolve**

Run: `vercel env ls production | grep KLIKQRIS_.*_PRICE`
Expected: all three keys present, values not shown in full.

- [ ] **Step 3: Commit the .env.example documentation if one exists**

```bash
git add .env.example 2>/dev/null || true
git commit -m "docs: document pricing env keys" --allow-empty
```

---

# Phase 1 — Reposition PRO & Fix the Copy

### Task 1.1: Rewrite the benefit boxes to be truthful

**Files:**
- Modify: `src/components/UpgradeProModal.tsx:339-382`
- Modify: `src/app/layout.tsx:131-138`

**Interfaces:**
- Produces: benefit copy that matches actual gating (`simulasi/page.tsx:128` is the only check).

- [ ] **Step 1: Write the failing test**

```ts
// tests/pricing.test.ts  (append)
import fs from 'fs';
import path from 'path';

describe('benefit copy honesty', () => {
  const modal = fs.readFileSync(
    path.join(process.cwd(), 'src/components/UpgradeProModal.tsx'), 'utf8');

  it('does not sell free features as PRO benefits', () => {
    const proSection = modal.slice(
      modal.indexOf('Keuntungan PRO All-Access'),
      modal.indexOf('Keuntungan Paket Satuan')
    );
    // drill + bank soal are ungated (Finding 4) — must not appear as PRO perks
    expect(proSection).not.toMatch(/drill subkategori/i);
    expect(proSection).not.toMatch(/Bank Soal 300/);
  });

  it('does not list leaderboard as a paid single-package perk', () => {
    const singleSection = modal.slice(modal.indexOf('Keuntungan Paket Satuan'));
    expect(singleSection).not.toMatch(/leaderboard nasional/i);
  });

  it('publishes the new PRO price in the layout schema', () => {
    const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    expect(layout).toMatch(/price:\s*'59000'/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pricing.test.ts`
Expected: FAIL on all three.

- [ ] **Step 3: Implement**

Replace the PRO benefit block (`UpgradeProModal.tsx:347-365`):

```tsx
              {selectedPlan === 'pro' ? (
                <>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    Buka seluruh {TOTAL_TRYOUT_PACKAGES} paket tryout, termasuk 120+ soal figural
                  </div>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    Rekap otomatis semua soal yang pernah kamu salah — disusun per subkategori
                  </div>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    Riwayat tryout tersimpan selamanya, tidak pernah dihapus
                  </div>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    Akses aktif selamanya sampai kamu lulus CPNS
                  </div>
                </>
              ) : (
```

Replace the single-package block (`UpgradeProModal.tsx:366-381`) — drop the leaderboard line, since it is free for everyone:

```tsx
                <>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    Akses penuh untuk {triggerPackage || 'paket ini'}
                  </div>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    110 Soal standar CAT BKN lengkap dengan pembahasan
                  </div>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    Pembahasan resmi untuk setiap soal
                  </div>
                </>
              )}
```

In `src/app/layout.tsx:134`, change `'150000'` to `'59000'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pricing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/UpgradeProModal.tsx src/app/layout.tsx tests/pricing.test.ts
git commit -m "fix(copy): stop listing free features as PRO benefits and publish new PRO price"
```

---

### Task 1.2: Surface the price ladder on the simulasi page

**Files:**
- Modify: `src/app/simulasi/page.tsx:301-306`

**Interfaces:**
- Consumes: prices from Task 0.1 (exposed to client via `NEXT_PUBLIC_` mirror or by rendering server-side).

- [ ] **Step 1: Write the failing test**

```ts
// tests/pricing.test.ts  (append)
describe('simulasi CTA copy', () => {
  it('does not advertise a misleading starting price', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/simulasi/page.tsx'), 'utf8');
    // PRO now costs 59000; "mulai Rp 5.000" next to an Upgrade PRO button is false
    expect(src).not.toMatch(/Upgrade PRO — mulai Rp 5\.000/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pricing.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/app/simulasi/page.tsx:301-306` — the button says "Upgrade PRO — mulai Rp 5.000", which conflates the single price with the PRO tier:

```tsx
                  <span className="hidden sm:inline">Upgrade PRO — Rp 59.000</span>
                  <span className="sm:hidden">PRO Rp 59.000</span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pricing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/simulasi/page.tsx tests/pricing.test.ts
git commit -m "fix(copy): show real PRO price on simulasi CTA"
```

---

# Phase 2 — PRO's Exclusive Feature: Wrong-Answer Recap

This is what makes the reprice defensible. It reads `exam_results.answers` (jsonb keyed by question number → option letter, Finding 7) joined to `questions`.

### Task 2.1: Build the recap aggregation

**Files:**
- Create: `src/lib/wrongAnswerRecap.ts`
- Test: `tests/wrong-answer-recap.test.ts`

**Interfaces:**
- Produces: `WrongAnswerItem = { packageId, number, category, yourAnswer, correctAnswer, explanation }`; `aggregateWrongAnswers(results, questions): WrongAnswerItem[]`; `groupByCategory(items): Record<'TWK'|'TIU'|'TKP', WrongAnswerItem[]>`. Task 2.2 consumes both.

- [ ] **Step 1: Write the failing test**

```ts
// tests/wrong-answer-recap.test.ts
import { describe, it, expect } from 'vitest';
import { aggregateWrongAnswers, groupByCategory } from '@/lib/wrongAnswerRecap';

type Opt = { id: string; score: number };

// Grade from options[].score, exactly as diagnostic.ts:38-50 and
// ExamQuestionReview.tsx:52-53 do. tryout-1..6 ship with correct_answer = null,
// so correct_answer alone would return zero items for them (Finding 8).
const mk = (packageId: string, number: number, category: string,
            correctAnswer: string | null, explanation: string | null,
            scores?: Record<string, number>) => {
  const options: Opt[] = Object.entries(scores ?? {}).map(([id, score]) => ({ id, score }));
  return { packageId, number, category, correctAnswer, explanation, options };
};

const Q = [
  // has correct_answer
  mk('tryout-10', 1, 'TWK', 'A', 'e1', { A: 5, B: 0, C: 0, D: 0, E: 0 }),
  mk('tryout-10', 2, 'TIU', 'B', 'e2', { A: 0, B: 5, C: 0, D: 0, E: 0 }),
  // TKP: correct_answer null, best option carries the max score
  mk('tryout-10', 3, 'TKP', null, 'e3', { A: 5, B: 4, C: 3, D: 2, E: 1 }),
  mk('tryout-10', 4, 'TWK', 'C', 'e4', { A: 0, B: 0, C: 5, D: 0, E: 0 }),
  // correct_answer null AND tied max score — ungradeable, must be skipped
  mk('tryout-4', 1, 'TWK', null, 'e5', { A: 0, B: 0, C: 0, D: 0, E: 0 }),
  // correct_answer present but options carry no score (tryout-figural) — still gradeable
  mk('tryout-figural', 1, 'TWK', 'D', 'e6', { A: 0, B: 0, C: 0, D: 0, E: 0 }),
];

describe('aggregateWrongAnswers', () => {
  it('keeps only answered questions where the chosen option is not the best', () => {
    const results = [{ packageId: 'tryout-10', answers: { '1': 'A', '2': 'B', '4': 'C' } }];
    expect(aggregateWrongAnswers(results, Q)).toHaveLength(0);
  });

  it('records wrong answers with the best-scoring option as correct', () => {
    const results = [{ packageId: 'tryout-10', answers: { '1': 'D', '2': 'C', '4': 'C' } }];
    const items = aggregateWrongAnswers(results, Q);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ number: 1, yourAnswer: 'D', correctAnswer: 'A', category: 'TWK' });
    expect(items[1]).toMatchObject({ number: 2, yourAnswer: 'C', correctAnswer: 'B' });
  });

  it('grades TKP rows from options when correct_answer is null', () => {
    const results = [{ packageId: 'tryout-10', answers: { '3': 'E' } }];
    const items = aggregateWrongAnswers(results, Q);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ category: 'TKP', correctAnswer: 'A', yourAnswer: 'E' });
  });

  it('accepts a full-score TKP answer when correct_answer is null', () => {
    const results = [{ packageId: 'tryout-10', answers: { '3': 'A' } }];
    expect(aggregateWrongAnswers(results, Q)).toHaveLength(0);
  });

  it('skips questions that are genuinely ungradeable (null correct_answer, no score)', () => {
    const results = [{ packageId: 'tryout-4', answers: { '1': 'A' } }];
    expect(aggregateWrongAnswers(results, Q)).toHaveLength(0);
  });

  it('falls back to correct_answer when options carry no score (tryout-figural)', () => {
    const results = [{ packageId: 'tryout-figural', answers: { '1': 'A' } }];
    const items = aggregateWrongAnswers(results, Q);
    expect(items).toHaveLength(1);
    expect(items[0].correctAnswer).toBe('D');
  });

  it('ignores questions with no recorded answer', () => {
    const results = [{ packageId: 'tryout-10', answers: { '1': 'A' } }];
    expect(aggregateWrongAnswers(results, Q)).toHaveLength(0);
  });

  it('ignores answers for questions that do not exist', () => {
    const results = [{ packageId: 'tryout-10', answers: { '99': 'Z' } }];
    expect(aggregateWrongAnswers(results, Q)).toHaveLength(0);
  });

  it('deduplicates repeat attempts of the same question, keeping it wrong once', () => {
    const results = [
      { packageId: 'tryout-10', answers: { '1': 'D' } },
      { packageId: 'tryout-10', answers: { '1': 'D' } },
    ];
    expect(aggregateWrongAnswers(results, Q)).toHaveLength(1);
  });
});

describe('groupByCategory', () => {
  it('partitions into TWK/TIU/TKP buckets', () => {
    const results = [{ packageId: 'tryout-10', answers: { '1': 'D', '2': 'C' } }];
    const grouped = groupByCategory(aggregateWrongAnswers(results, Q));
    expect(grouped.TWK).toHaveLength(1);
    expect(grouped.TIU).toHaveLength(1);
    expect(grouped.TKP).toHaveLength(0);
  });

  it('returns all three keys even when empty', () => {
    const grouped = groupByCategory([]);
    expect(Object.keys(grouped).sort()).toEqual(['TKP', 'TIU', 'TWK']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wrong-answer-recap.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
// src/lib/wrongAnswerRecap.ts
export type Category = 'TWK' | 'TIU' | 'TKP';

export interface RecapOption { id: string; score: number }

export interface QuestionRow {
  packageId: string;
  number: number;
  category: string;
  correctAnswer: string | null;
  explanation: string | null;
  options: RecapOption[];
}

export interface ResultRow {
  packageId: string;
  answers: Record<string, string>;
}

export interface WrongAnswerItem {
  packageId: string;
  number: number;
  category: Category;
  yourAnswer: string;
  correctAnswer: string;
  explanation: string | null;
}

/**
 * Mirror of src/lib/diagnostic.ts:38-50: the best answer is the option holding
 * the maximum score. TKP rows routinely ship with correct_answer = null but a
 * full 1..5 score ladder on options, so grading must read options, not the
 * column (Finding 8).
 */
function bestOptionId(options: RecapOption[]): string | null {
  if (!Array.isArray(options) || options.length === 0) return null;
  let max = -Infinity;
  let id: string | null = null;
  let tied = false;
  for (const o of options) {
    const s = typeof o?.score === 'number' ? o.score : -Infinity;
    if (s > max) { max = s; id = o?.id ?? null; tied = false; }
    else if (s === max) { tied = true; }
  }
  // A tie means no single best answer exists — the question is ungradeable.
  return max === -Infinity || tied ? null : id;
}

/**
 * A question counts as wrong when the user answered it, a best answer can be
 * determined, and the chosen option is not it.
 */
export function aggregateWrongAnswers(
  results: ResultRow[],
  questions: QuestionRow[]
): WrongAnswerItem[] {
  const byKey = new Map<string, QuestionRow>();
  for (const q of questions) byKey.set(`${q.packageId}#${q.number}`, q);

  const seen = new Set<string>();
  const out: WrongAnswerItem[] = [];

  for (const r of results) {
    if (!r?.answers) continue;
    for (const [numStr, given] of Object.entries(r.answers)) {
      const number = Number(numStr);
      if (!Number.isInteger(number)) continue;
      if (typeof given !== 'string' || !given) continue;

      const q = byKey.get(`${r.packageId}#${number}`);
      if (!q) continue;

      // options first, correct_answer as the fallback (tryout-figural ships
      // correct_answer with an all-zero options score ladder).
      const correct = bestOptionId(q.options) ?? (q.correctAnswer || null);
      if (!correct) continue;
      if (correct === given) continue;

      const dedupeKey = `${r.packageId}#${number}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      out.push({
        packageId: r.packageId,
        number,
        category: (q.category as Category) ?? 'TWK',
        yourAnswer: given,
        correctAnswer: correct,
        explanation: q.explanation,
      });
    }
  }

  // Stable, predictable ordering for the UI
  out.sort((a, b) =>
    a.packageId === b.packageId
      ? a.number - b.number
      : a.packageId.localeCompare(b.packageId)
  );
  return out;
}

export function groupByCategory(
  items: WrongAnswerItem[]
): Record<Category, WrongAnswerItem[]> {
  const grouped: Record<Category, WrongAnswerItem[]> = { TWK: [], TIU: [], TKP: [] };
  for (const i of items) grouped[i.category]?.push(i);
  return grouped;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wrong-answer-recap.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/wrongAnswerRecap.ts tests/wrong-answer-recap.test.ts
git commit -m "feat(pro): add wrong-answer aggregation for PRO recap"
```

---

### Task 2.2: Gate the recap endpoint behind `is_pro`

**Files:**
- Create: `src/app/api/pro/recap/route.ts`
- Test: `tests/pro-recap.test.ts`

**Interfaces:**
- Consumes: `aggregateWrongAnswers`, `groupByCategory` from Task 2.1; `getDb` from `src/lib/db.ts`; cookie `cpns_token` + `verifyToken` from `src/lib/auth`.
- Produces: GET `/api/pro/recap` → `{ success: true, isPro: true, total, grouped, byPackage }` | 401 unauthenticated | 403 not PRO.

- [ ] **Step 1: Write the failing test**

```ts
// tests/pro-recap.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => mockSql }));

const mockCookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({ cookies: () => mockCookieStore }));

const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({ verifyToken: (...a: any[]) => mockVerifyToken(...a) }));

import { GET as recap } from '@/app/api/pro/recap/route';

const req = () => new NextRequest('http://localhost:3000/api/pro/recap');

beforeEach(() => {
  vi.resetAllMocks();
  mockCookieStore.get.mockReturnValue({ value: 'tok' });
  mockVerifyToken.mockResolvedValue({ userId: 'u-1', email: 'a@b.c' });
});

describe('GET /api/pro/recap', () => {
  it('returns 401 when the session token is missing', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const res = await recap(req());
    expect(res.status).toBe(401);
  });

  it('returns 403 when the user is not PRO', async () => {
    mockSql.mockResolvedValueOnce([{ is_pro: false }]);
    const res = await recap(req());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/PRO/i);
  });

  it('returns 200 with an empty recap when a PRO user has no attempts', async () => {
    mockSql
      .mockResolvedValueOnce([{ is_pro: true }])            // user
      .mockResolvedValueOnce([])                            // results
      .mockResolvedValueOnce([]);                           // questions
    const res = await recap(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(0);
    expect(json.grouped.TWK).toEqual([]);
  });

  it('returns aggregated wrong answers for a PRO user', async () => {
    mockSql
      .mockResolvedValueOnce([{ is_pro: true }])
      .mockResolvedValueOnce([
        { package_id: 'tryout-1', answers: { '1': 'D', '2': 'B' } },
      ])
      .mockResolvedValueOnce([
        { package_id: 'tryout-1', number: 1, category: 'TWK', correct_answer: 'A', explanation: 'e1',
          options: [{ id: 'A', text: 'x', score: 5 }, { id: 'B', text: 'y', score: 0 }] },
        { package_id: 'tryout-1', number: 2, category: 'TIU', correct_answer: null, explanation: 'e2',
          options: [{ id: 'A', text: 'x', score: 0 }, { id: 'B', text: 'y', score: 5 }] },
      ]);
    const res = await recap(req());
    const json = await res.json();
    expect(json.total).toBe(1);
    expect(json.grouped.TWK).toHaveLength(1);
    expect(json.grouped.TIU).toHaveLength(0);
    expect(json.byPackage.tryout-1).toBe(1);
  });

  it('never leaks the is_pro=false path as a 200', async () => {
    mockSql.mockResolvedValueOnce([{ is_pro: null }]);
    const res = await recap(req());
    expect(res.status).toBe(403);
  });
});
```

Fix the object key syntax in the last-but-one test before running (`byPackage['tryout-1']`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pro-recap.test.ts`
Expected: FAIL — route does not exist.

- [ ] **Step 3: Implement**

```ts
// src/app/api/pro/recap/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { aggregateWrongAnswers, groupByCategory } from '@/lib/wrongAnswerRecap';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const token = cookies().get('cpns_token')?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    const userRows = await sql`
      SELECT is_pro FROM users WHERE id = ${payload.userId} LIMIT 1
    `;
    if (userRows.length === 0 || !userRows[0].is_pro) {
      return NextResponse.json(
        { error: 'PRO_REQUIRED', message: 'Fitur ini hanya untuk akun PRO.' },
        { status: 403 }
      );
    }

    const [resultRows, questionRows] = await Promise.all([
      sql`
        SELECT package_id, answers
        FROM exam_results
        WHERE user_id = ${payload.userId}
          AND answers IS NOT NULL
          AND answers::text <> '{}'
        ORDER BY finished_at ASC
      `,
      sql`
        SELECT package_id, number, category, correct_answer, explanation, options
        FROM questions
      `,
    ]);

    const results = (resultRows as any[]).map((r) => ({
      packageId: r.package_id,
      answers: (r.answers ?? {}) as Record<string, string>,
    }));

    const questions = (questionRows as any[]).map((q) => ({
      packageId: q.package_id,
      number: Number(q.number),
      category: q.category,
      correctAnswer: q.correct_answer ?? null,
      explanation: q.explanation ?? null,
      options: Array.isArray(q.options)
        ? q.options.map((o: any) => ({ id: o?.id ?? '', score: typeof o?.score === 'number' ? o.score : 0 }))
        : [],
    }));

    const items = aggregateWrongAnswers(results, questions);
    const grouped = groupByCategory(items);

    const byPackage: Record<string, number> = {};
    for (const i of items) byPackage[i.packageId] = (byPackage[i.packageId] ?? 0) + 1;

    return NextResponse.json({ success: true, isPro: true, total: items.length, grouped, byPackage });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[pro/recap]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pro-recap.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/pro/recap/route.ts tests/pro-recap.test.ts
git commit -m "feat(pro): gate wrong-answer recap behind is_pro"
```

---

### Task 2.3: Render the recap page

**Files:**
- Create: `src/app/rekap/page.tsx`
- Test: `tests/pro-recap.test.ts` (append)

**Interfaces:**
- Consumes: GET `/api/pro/recap` from Task 2.2; `groupByCategory` shape.

- [ ] **Step 1: Write the failing test**

```ts
// tests/pro-recap.test.ts  (append)
describe('/rekap page', () => {
  it('exists and is a client component that calls the recap endpoint', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const p = path.join(process.cwd(), 'src/app/rekap/page.tsx');
    expect(fs.existsSync(p)).toBe(true);
    const src = fs.readFileSync(p, 'utf8');
    expect(src).toMatch(/'use client'/);
    expect(src).toMatch(/\/api\/pro\/recap/);
    // must not use lucide-react (project constraint)
    expect(src).not.toMatch(/lucide-react/);
  });

  it('handles the 403 PRO gate with a readable state', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/rekap/page.tsx'), 'utf8');
    expect(src).toMatch(/403|PRO_REQUIRED/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pro-recap.test.ts`
Expected: FAIL — file missing.

- [ ] **Step 3: Implement**

```tsx
// src/app/rekap/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown, Spinner, XCircle, BookOpen } from '@phosphor-icons/react';

type Item = {
  packageId: string;
  number: number;
  category: 'TWK' | 'TIU' | 'TKP';
  yourAnswer: string;
  correctAnswer: string;
  explanation: string | null;
};

type Grouped = Record<'TWK' | 'TIU' | 'TKP', Item[]>;

const CATEGORY_LABEL: Record<string, string> = {
  TWK: 'Tes Wawasan Kebangsaan',
  TIU: 'Tes Intelegensia Umum',
  TKP: 'Tes Karakteristik Pribadi',
};

export default function RekapPage() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState('');
  const [grouped, setGrouped] = useState<Grouped | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch('/api/pro/recap')
      .then(async (r) => {
        if (r.status === 403) { setDenied(true); return; }
        if (!r.ok) throw new Error('Gagal memuat rekap.');
        const d = await r.json();
        setGrouped(d.grouped);
        setTotal(d.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Koneksi bermasalah.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={28} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="card-modern max-w-md mx-auto p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-amber-100 text-amber-600">
            <Crown size={26} weight="duotone" />
          </div>
          <h1 className="text-lg font-bold">Fitur PRO</h1>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
            Rekap soal salah tersedia untuk akun PRO. Kamu bisa melihat semua soal yang
            pernah kamu jawab salah, dikelompokkan per subkategori.
          </p>
          <Link href="/simulasi" className="btn-primary inline-block px-5 py-2.5 text-sm font-semibold">
            Lihat Paket PRO
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-3xl mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <XCircle size={16} weight="fill" /> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/simulasi" className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft size={14} /> Kembali ke Simulasi
        </Link>

        <div className="card-modern p-6 space-y-2">
          <h1 className="text-xl font-bold tracking-tight">Rekap Soal Yang Pernah Kamu Salah</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            {total === 0
              ? 'Belum ada jawaban salah yang tercatat. Pertahankan!'
              : `${total} soal perlu kamu pelajari ulang.`}
          </p>
        </div>

        {total > 0 && grouped && (
          <div className="space-y-5">
            {(['TWK', 'TIU', 'TKP'] as const).map((cat) => {
              const items = grouped[cat] ?? [];
              if (items.length === 0) return null;
              return (
                <section key={cat} className="card-modern p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-sm">{CATEGORY_LABEL[cat]}</h2>
                    <span className="badge-pill text-[11px] px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200">
                      {items.length}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {items.map((i) => (
                      <li key={`${i.packageId}-${i.number}`} className="p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                        <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                          <BookOpen size={13} weight="duotone" />
                          {i.packageId} · Soal {i.number}
                        </div>
                        <div className="text-xs flex flex-wrap gap-x-5 gap-y-1 mb-1.5">
                          <span className="text-red-600">Jawabanmu: {i.yourAnswer}</span>
                          <span className="text-emerald-600">Kunci: {i.correctAnswer}</span>
                        </div>
                        {i.explanation && (
                          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{i.explanation}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pro-recap.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Verify the build compiles the new route**

Run: `npm run build`
Expected: `/rekap` present in the route manifest; no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/rekap/page.tsx tests/pro-recap.test.ts
git commit -m "feat(pro): add wrong-answer recap page"
```

---

# Phase 3 — Bundle Tier

Depends on Phase 0 (price authority) and the Finding 5 fix in Task 3.4.

### Task 3.1: Add `package_ids` to `payment_orders`

**Files:**
- Create: `migrations/011_add_bundle_package_ids.sql`

**Interfaces:**
- Produces: `payment_orders.package_ids jsonb` (nullable, additive). Task 3.3 writes it; Task 3.4 and 3.5 read it.

- [ ] **Step 1: Write the migration**

```sql
-- Migration 011: store the selected package list for bundle orders.
-- Additive only: existing rows keep NULL, order_type gains no constraint
-- because payment_orders.order_type is varchar with no CHECK (verified).
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS package_ids jsonb;

COMMENT ON COLUMN payment_orders.package_ids IS
  'For order_type = bundle: array of package ids the buyer selected. NULL otherwise.';
```

- [ ] **Step 2: Apply it to the database**

Run: `node -e` script using `DATABASE_URL` from `.env.local`, executing the file contents through `sql.query`. Do not print `DATABASE_URL`.

Expected: `ALTER TABLE` succeeds.

- [ ] **Step 3: Verify the column exists**

Query `information_schema.columns` for `payment_orders.package_ids`.
Expected: one row, `data_type = jsonb`.

- [ ] **Step 4: Commit**

```bash
git add migrations/011_add_bundle_package_ids.sql
git commit -m "feat(payment): add package_ids column for bundle orders"
```

---

### Task 3.2: Validate bundle selection in the pricing module

**Files:**
- Modify: `src/lib/pricing.ts`
- Test: `tests/pricing.test.ts` (append)

**Interfaces:**
- Produces: `BUNDLE_SIZE = 5`; `validateBundlePackageIds(ids, unlocked, freeIds): { ok: true; ids: string[] } | { ok: false; reason: string }`. Task 3.3 consumes it.

- [ ] **Step 1: Write the failing test**

```ts
// tests/pricing.test.ts  (append)
import { validateBundlePackageIds, BUNDLE_SIZE, FREE_PACKAGE_IDS } from '@/lib/pricing';

describe('validateBundlePackageIds', () => {
  const free = new Set(FREE_PACKAGE_IDS);

  it('accepts exactly BUNDLE_SIZE paid packages', () => {
    const ids = ['tryout-4', 'tryout-5', 'tryout-6', 'tryout-7', 'tryout-8'];
    expect(BUNDLE_SIZE).toBe(5);
    const res = validateBundlePackageIds(ids, [], free);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.ids).toHaveLength(5);
  });

  it('rejects the wrong count', () => {
    expect(validateBundlePackageIds(['tryout-4'], [], free).ok).toBe(false);
    expect(validateBundlePackageIds([], [], free).ok).toBe(false);
  });

  it('rejects free packages', () => {
    const res = validateBundlePackageIds(
      ['tryout-mini', 'tryout-4', 'tryout-5', 'tryout-6', 'tryout-7'], [], free);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/gratis/i);
  });

  it('rejects packages the user already owns', () => {
    const res = validateBundlePackageIds(
      ['tryout-4', 'tryout-5', 'tryout-6', 'tryout-7', 'tryout-8'],
      ['tryout-6'], free);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/tryout-6/);
  });

  it('rejects duplicates in the selection', () => {
    const res = validateBundlePackageIds(
      ['tryout-4', 'tryout-4', 'tryout-5', 'tryout-6', 'tryout-7'], [], free);
    expect(res.ok).toBe(false);
  });

  it('rejects non-array input', () => {
    expect(validateBundlePackageIds('tryout-4' as any, [], free).ok).toBe(false);
    expect(validateBundlePackageIds(undefined as any, [], free).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pricing.test.ts`
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement**

Append to `src/lib/pricing.ts`:

```ts
/** How many packages a single bundle purchase unlocks. */
export const BUNDLE_SIZE = 5;

/** Kept in sync with FREE_IDS in src/app/simulasi/page.tsx:60. */
export const FREE_PACKAGE_IDS = ['tryout-mini', 'tryout-1', 'tryout-2'] as const;

export type BundleValidation =
  | { ok: true; ids: string[] }
  | { ok: false; reason: string };

/**
 * A bundle must be exactly BUNDLE_SIZE distinct, paid, not-yet-owned packages.
 * Rejecting owned packages up front prevents charging for access the user
 * already has.
 */
export function validateBundlePackageIds(
  ids: unknown,
  unlocked: readonly string[],
  freeIds: ReadonlySet<string>
): BundleValidation {
  if (!Array.isArray(ids)) return { ok: false, reason: 'packageIds harus berupa array.' };
  if (ids.length !== BUNDLE_SIZE) {
    return { ok: false, reason: `Bundle harus tepat ${BUNDLE_SIZE} paket.` };
  }

  const cleaned = ids.map((v) => String(v).trim()).filter(Boolean);
  if (cleaned.length !== BUNDLE_SIZE) {
    return { ok: false, reason: 'Terdapat packageId kosong pada pilihanmu.' };
  }
  if (new Set(cleaned).size !== cleaned.length) {
    return { ok: false, reason: 'Terdapat paket duplikat pada pilihanmu.' };
  }

  for (const id of cleaned) {
    if (freeIds.has(id)) {
      return { ok: false, reason: `Paket ${id} sudah gratis, tidak perlu dibeli.` };
    }
  }
  for (const id of cleaned) {
    if (unlocked.includes(id)) {
      return { ok: false, reason: `Paket ${id} sudah terbuka untuk akunmu.` };
    }
  }

  return { ok: true, ids: cleaned };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pricing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing.ts tests/pricing.test.ts
git commit -m "feat(pricing): add bundle size and selection validation"
```

---

### Task 3.3: Accept bundle orders in create-order

**Files:**
- Modify: `src/app/api/payment/create-order/route.ts`
- Test: `tests/bundle-order.test.ts`

**Interfaces:**
- Consumes: `validateBundlePackageIds`, `FREE_PACKAGE_IDS` from Task 3.2; `priceFor` from Task 0.1.
- Produces: POST with `{ orderType: 'bundle', packageIds: string[] }` writes `package_ids` jsonb and `package_id = 'bundle'`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/bundle-order.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => mockSql }));
const mockCookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({ cookies: () => mockCookieStore }));
const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({ verifyToken: (...a: any[]) => mockVerifyToken(...a) }));
const mockCreateKlikQris = vi.fn();
vi.mock('@/lib/klikqris', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/klikqris')>();
  return { ...actual, createKlikQrisTransaction: (...a: any[]) => mockCreateKlikQris(...a) };
});

import { POST as createOrder } from '@/app/api/payment/create-order/route';

const req = (body: object) =>
  new NextRequest('http://localhost:3000/api/payment/create-order', {
    method: 'POST', body: JSON.stringify(body),
  });

const VALID = ['tryout-4', 'tryout-5', 'tryout-6', 'tryout-7', 'tryout-8'];

beforeEach(() => {
  vi.resetAllMocks();
  mockCookieStore.get.mockReturnValue({ value: 'tok' });
  mockVerifyToken.mockResolvedValue({ userId: 'u-1', email: 'a@b.c' });
});

describe('bundle order creation', () => {
  it('prices a bundle at the bundle table price', async () => {
    mockSql
      .mockResolvedValueOnce([{ is_pro: false, unlocked_packages: [] }]) // guard
      .mockResolvedValueOnce([])                                        // existing pending
      .mockResolvedValueOnce([{ id: 700 }])                             // INSERT
      .mockResolvedValueOnce([]);                                       // UPDATE
    mockCreateKlikQris.mockResolvedValueOnce({
      success: true, orderId: 'INV-700', uniqueCode: 9,
      totalAmount: 18009, qrisUrl: 'https://x/q.png',
      qrisImage: 'data:image/png;base64,q', signature: 's',
    });

    const res = await createOrder(req({ orderType: 'bundle', packageIds: VALID }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.baseAmount).toBe(18000);
    expect(json.orderType).toBe('bundle');
    expect(json.packageIds).toEqual(VALID);
    expect(mockCreateKlikQris).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 18000 })
    );
  });

  it('rejects a bundle with the wrong number of packages', async () => {
    const res = await createOrder(req({ orderType: 'bundle', packageIds: ['tryout-4'] }));
    expect(res.status).toBe(400);
  });

  it('rejects a bundle containing a package the user already owns', async () => {
    mockSql.mockResolvedValueOnce([{ is_pro: false, unlocked_packages: ['tryout-5'] }]);
    const res = await createOrder(req({ orderType: 'bundle', packageIds: VALID }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('ALREADY_UNLOCKED');
  });

  it('rejects a bundle containing a free package', async () => {
    const res = await createOrder(
      req({ orderType: 'bundle', packageIds: ['tryout-mini', 'tryout-4', 'tryout-5', 'tryout-6', 'tryout-7'] })
    );
    expect(res.status).toBe(400);
  });

  it('rejects a bundle for a user who is already PRO', async () => {
    mockSql.mockResolvedValueOnce([{ is_pro: true, unlocked_packages: [] }]);
    const res = await createOrder(req({ orderType: 'bundle', packageIds: VALID }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('ALREADY_PRO');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bundle-order.test.ts`
Expected: FAIL — `packageIds` not read; order priced as single/pro.

- [ ] **Step 3: Implement**

In `src/app/api/payment/create-order/route.ts`, after `packageId` is parsed and inside the existing already-owned guard block (lines 48-73), add:

```ts
    // Bundle selection is validated server-side before any order row exists.
    let bundleIds: string[] | null = null;
    if (orderType === 'bundle') {
      const unlockedArrForBundle: string[] = userId && userRows.length > 0
        ? (Array.isArray(userRows[0].unlocked_packages) ? userRows[0].unlocked_packages : [])
        : [];
      const check = validateBundlePackageIds(
        body.packageIds, unlockedArrForBundle, new Set<string>(FREE_PACKAGE_IDS)
      );
      if (!check.ok) {
        return NextResponse.json(
          { error: 'INVALID_BUNDLE', message: check.reason },
          { status: 400 }
        );
      }
      bundleIds = check.ids;
    }
```

Restructure the guard so `userRows` is fetched once for all types (it already is) and the bundle branch runs after the `is_pro` and `single` checks. The `single` branch must not swallow `bundle`.

Update the INSERT (lines 154-165):

```ts
    const inserted = await sql`
      INSERT INTO payment_orders (
        user_id, user_email, package_id, order_type,
        base_amount, unique_code, exact_amount, status, package_ids
      ) VALUES (
        ${userId}, ${userEmail || null}, ${orderType === 'bundle' ? 'bundle' : packageId},
        ${orderType},
        ${baseAmount}, ${0}, ${baseAmount}, 'pending',
        ${bundleIds ? JSON.stringify(bundleIds) : null}::jsonb
      )
      RETURNING id
    `;
```

Update `keterangan` (line 166-168):

```ts
    const keterangan = orderType === 'single'
      ? `Lolos.in - Akses ${packageId}`
      : orderType === 'bundle'
      ? `Lolos.in - Paket Bundle ${BUNDLE_SIZE} Tryout`
      : 'Lolos.in - Upgrade Akun PRO';
```

Add imports:

```ts
import { priceFor, isOrderType, validateBundlePackageIds, FREE_PACKAGE_IDS, BUNDLE_SIZE } from '@/lib/pricing';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/bundle-order.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Run full suite for regressions**

Run: `npx vitest run`
Expected: all files PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/payment/create-order/route.ts tests/bundle-order.test.ts
git commit -m "feat(payment): accept bundle orders with server-side selection validation"
```

---

### Task 3.4: Fulfil bundle orders consistently in BOTH paths

**Files:**
- Modify: `src/app/api/webhooks/klikqris/route.ts:84-107`
- Modify: `src/app/api/payment/sync/route.ts:62-78`
- Test: `tests/bundle-fulfilment.test.ts`

**Interfaces:**
- Consumes: `package_ids` jsonb from Task 3.1.
- Produces: both paths append bundle packages to `unlocked_packages` and never set `is_pro` for `bundle`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/bundle-fulfilment.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => mockSql }));
const mockCookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({ cookies: () => mockCookieStore }));
const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({ verifyToken: (...a: any[]) => mockVerifyToken(...a) }));
const mockCheckKlikQris = vi.fn();
vi.mock('@/lib/klikqris', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/klikqris')>();
  return { ...actual, checkKlikQrisStatus: (...a: any[]) => mockCheckKlikQris(...a) };
});

import { POST as webhook } from '@/app/api/webhooks/klikqris/route';
import { POST as sync } from '@/app/api/payment/sync/route';

const BUNDLE = ['tryout-4', 'tryout-5', 'tryout-6', 'tryout-7', 'tryout-8'];

/** Extracts every UPDATE issued, so we can assert is_pro was never set true. */
function sqlText(): string {
  return mockSql.mock.calls
    .map((c) => (Array.isArray(c[0]) ? c[0].join('?') : String(c[0])))
    .join('\n');
}

beforeEach(() => {
  vi.resetAllMocks();
  mockCookieStore.get.mockReturnValue({ value: 'tok' });
  mockVerifyToken.mockResolvedValue({ userId: 'u-1', email: 'a@b.c' });
});

describe('bundle fulfilment — webhook path', () => {
  it('appends all bundle packages and does not set is_pro', async () => {
    mockSql
      .mockResolvedValueOnce([{ id: 1, user_id: 'u-1', user_email: null, package_id: 'bundle',
        order_type: 'bundle', exact_amount: 18000, status: 'pending', signature: null,
        package_ids: BUNDLE }])                                  // order SELECT
      .mockResolvedValueOnce([])                                 // UPDATE payment_orders
      .mockResolvedValueOnce([{ unlocked_packages: [] }])        // SELECT users
      .mockResolvedValueOnce([]);                                // UPDATE users

    const req = new NextRequest('http://localhost:3000/api/webhooks/klikqris', {
      method: 'POST',
      body: JSON.stringify({ order_id: 'INV-1', status: 'PAID', total_amount: 18000 }),
    });
    const res = await webhook(req);
    expect(res.status).toBe(200);

    expect(sqlText()).toContain('unlocked_packages');
    expect(sqlText()).not.toMatch(/is_pro\s*=\s*(true|TRUE)/i);
  });
});

describe('bundle fulfilment — manual sync path', () => {
  it('appends bundle packages instead of falling through to is_pro', async () => {
    mockSql
      .mockResolvedValueOnce([{ id: 1, user_id: 'u-1', user_email: null, package_id: 'bundle',
        order_type: 'bundle', base_amount: 18000, exact_amount: 18000, status: 'pending',
        package_ids: BUNDLE }])                                  // order SELECT
      .mockResolvedValueOnce([])                                 // UPDATE payment_orders
      .mockResolvedValueOnce([{ id: 'u-1', email: 'a@b.c', is_pro: false, unlocked_packages: [] }])
      .mockResolvedValueOnce([]);                                // UPDATE users
    mockCheckKlikQris.mockResolvedValue({ success: true, status: 'PAID' });

    const req = new NextRequest('http://localhost:3000/api/payment/sync', {
      method: 'POST', body: JSON.stringify({ orderId: 1 }),
    });
    const res = await sync(req);
    expect(res.status).toBe(200);

    expect(sqlText()).toContain('unlocked_packages');
    expect(sqlText()).not.toMatch(/is_pro\s*=\s*(TRUE|true)/i);
  });

  it('still grants PRO for an order_type of pro', async () => {
    mockSql
      .mockResolvedValueOnce([{ id: 2, user_id: 'u-1', user_email: null, package_id: null,
        order_type: 'pro', base_amount: 59000, exact_amount: 59000, status: 'pending' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'u-1', email: 'a@b.c', is_pro: false, unlocked_packages: [] }])
      .mockResolvedValueOnce([]);
    mockCheckKlikQris.mockResolvedValue({ success: true, status: 'PAID' });

    const req = new NextRequest('http://localhost:3000/api/payment/sync', {
      method: 'POST', body: JSON.stringify({ orderId: 2 }),
    });
    await sync(req);
    expect(sqlText()).toMatch(/is_pro\s*=\s*TRUE/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bundle-fulfilment.test.ts`
Expected: FAIL — bundle falls into the `else { is_pro = TRUE }` branch on sync, and grants nothing on webhook.

- [ ] **Step 3: Implement the webhook path**

Replace the access-update block at `src/app/api/webhooks/klikqris/route.ts:84-107`:

```ts
      // Update user access. Every order_type is handled explicitly so a new
      // tier can never silently fall through to full PRO (Finding 5).
      if (order.user_id) {
        if (order.order_type === 'pro') {
          await sql`
            UPDATE users
            SET is_pro = true,
                pro_activated_at = NOW()
            WHERE id = ${order.user_id}
          `;
        } else if (
          (order.order_type === 'single' && order.package_id) ||
          order.order_type === 'bundle'
        ) {
          const toUnlock: string[] = order.order_type === 'bundle'
            ? (Array.isArray(order.package_ids) ? order.package_ids : [])
            : [order.package_id as string];

          if (toUnlock.length > 0) {
            const userRows = await sql`SELECT unlocked_packages FROM users WHERE id = ${order.user_id} LIMIT 1`;
            if (userRows.length > 0) {
              const current: string[] = Array.isArray(userRows[0].unlocked_packages)
                ? userRows[0].unlocked_packages : [];
              const merged = [...current];
              for (const id of toUnlock) if (!merged.includes(id)) merged.push(id);
              if (merged.length !== current.length) {
                await sql`
                  UPDATE users
                  SET unlocked_packages = ${JSON.stringify(merged)}::jsonb
                  WHERE id = ${order.user_id}
                `;
              }
            }
          }
        } else {
          console.warn(`[KlikQRIS Webhook] Unknown order_type "${order.order_type}" for order #${orderId} — access not granted`);
        }
      }
```

Also add `package_ids` to the order SELECT at line 48:

```ts
      SELECT id, user_id, user_email, package_id, order_type, exact_amount, status, signature, package_ids
```

- [ ] **Step 4: Implement the sync path**

Replace lines 62-78 of `src/app/api/payment/sync/route.ts`:

```ts
          if (order.order_type === 'pro') {
            await sql`
              UPDATE users
              SET is_pro = TRUE,
                  pro_activated_at = NOW()
              WHERE id = ${u.id}
            `;
          } else if (
            (order.order_type === 'single' && order.package_id) ||
            order.order_type === 'bundle'
          ) {
            const toUnlock: string[] = order.order_type === 'bundle'
              ? (Array.isArray(order.package_ids) ? order.package_ids : [])
              : [order.package_id as string];

            if (toUnlock.length > 0) {
              for (const id of toUnlock) {
                if (!currentUnlocked.includes(id)) currentUnlocked.push(id);
              }
              await sql`
                UPDATE users
                SET unlocked_packages = ${JSON.stringify(currentUnlocked)}::jsonb
                WHERE id = ${u.id}
              `;
            }
          } else {
            console.warn(`[payment/sync] Unknown order_type "${order.order_type}" — access not granted`);
          }
```

Add `package_ids` to the sync order SELECT at line 20:

```ts
      SELECT id, user_id, user_email, package_id, order_type, base_amount, exact_amount, status, package_ids
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/bundle-fulfilment.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Run the whole suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/webhooks/klikqris/route.ts src/app/api/payment/sync/route.ts tests/bundle-fulfilment.test.ts
git commit -m "fix(payment): fulfil bundle orders in both webhook and sync paths"
```

---

### Task 3.5: Add the bundle option to the modal

**Files:**
- Modify: `src/components/UpgradeProModal.tsx:49,63-90,104,164,285-337,339-382,415`
- Test: `tests/bundle-order.test.ts` (append)

**Interfaces:**
- Consumes: POST `{ orderType: 'bundle', packageIds }` from Task 3.3.

- [ ] **Step 1: Write the failing test**

```ts
// tests/bundle-order.test.ts  (append)
describe('bundle UI', () => {
  it('UpgradeProModal exposes three tiers', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/components/UpgradeProModal.tsx'), 'utf8');
    expect(src).toMatch(/'bundle'/);
    expect(src).toMatch(/Rp 18\.000|18000/);
    expect(src).toMatch(/Rp 59\.000|59000/);
    // three-tier selector must not still be a 2-column grid only
    expect(src).toMatch(/grid-cols-3/);
  });

  it('sends packageIds for the bundle tier', () => {
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/components/UpgradeProModal.tsx'), 'utf8');
    expect(src).toMatch(/packageIds/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bundle-order.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Extend the plan union (line 49):

```ts
  const [selectedPlan, setSelectedPlan] = useState<'single' | 'bundle' | 'pro'>('pro');
```

`fetchOrder` (lines 63-90) — accept the selection and stop sending amounts:

```ts
  const fetchOrder = useCallback(
    async (plan: 'single' | 'bundle' | 'pro', pkgIds?: string[]) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: plan,
          packageId: plan === 'single' ? packageId : undefined,
          packageIds: plan === 'bundle' ? pkgIds : undefined,
        }),
      });
```

Add bundle selection state and the default curated selection:

```ts
  const [bundleIds, setBundleIds] = useState<string[]>([]);

  // Default bundle: the standard CAT-format set (tryout-8..12). Chosen because
  // they are 110-soal/30 TWK/35 TIU/45 TKP, carry a full correct_answer on
  // every row, and read as a coherent starter set in the picker.
  useEffect(() => {
    if (!isOpen || packageId) return;
    setBundleIds((prev) => prev.length ? prev : ['tryout-8', 'tryout-9', 'tryout-10', 'tryout-11', 'tryout-12']);
  }, [isOpen, packageId]);
```

Change the selector from `grid-cols-2` to `grid-cols-3` (line 290) and add the third card between the existing two:

```tsx
                  <button
                    type="button"
                    onClick={() => handleSelectPlan('bundle')}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedPlan === 'bundle'
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/30'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <span className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl">
                      HEMAT 28%
                    </span>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700">
                      <Package size={14} weight="duotone" />
                      Bundle 5 Paket
                    </div>
                    <div className="text-base font-extrabold text-[var(--foreground)] mt-1">
                      Rp 18.000
                    </div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                      Rp 3.600 per paket
                    </div>
                  </button>
```

Update `handleSelectPlan` (line 164) and `initialPlan` (line 104) to carry `bundle`. Update the benefit box to render a third branch keyed on `selectedPlan === 'bundle'`. Update the pay button amount to read `orderInfo?.baseAmount` (Task 0.3 Step 3).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/bundle-order.test.ts`
Expected: PASS

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/UpgradeProModal.tsx tests/bundle-order.test.ts
git commit -m "feat(payment): add three-tier bundle selection to upgrade modal"
```

---

### Task 3.6: Label bundle orders in history, reminders, and riwayat

**Files:**
- Modify: `src/app/api/payment/history/route.ts:62-65`
- Modify: `src/app/api/payment/abandoned-reminders/route.ts:48`
- Modify: `src/app/riwayat/page.tsx:60,745`
- Test: `tests/bundle-order.test.ts` (append)

**Interfaces:**
- Consumes: `order_type = 'bundle'`, `package_ids` jsonb.

- [ ] **Step 1: Write the failing test**

```ts
// tests/bundle-order.test.ts  (append)
describe('bundle labelling', () => {
  it('history route maps bundle to a readable title', () => {
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/app/api/payment/history/route.ts'), 'utf8');
    expect(src).toMatch(/order_type === 'bundle'/);
  });

  it('abandoned reminder labels bundle orders', () => {
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/app/api/payment/abandoned-reminders/route.ts'), 'utf8');
    expect(src).toMatch(/order_type === 'bundle'/);
  });

  it('riwayat page accepts the bundle order type', () => {
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/app/riwayat/page.tsx'), 'utf8');
    expect(src).toMatch(/'bundle'/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bundle-order.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`history/route.ts:62-65` — the default title is PRO, so bundle would be mislabelled:

```ts
      let packageTitle = 'Paket Member PRO (Akses Semua Tryout)';
      if (r.order_type === 'bundle') {
        packageTitle = `Bundle ${Array.isArray(r.package_ids) ? r.package_ids.length : BUNDLE_SIZE} Paket Tryout`;
      } else if (r.order_type === 'single' && r.package_id) {
        packageTitle = titleMap.get(r.package_id) || `Paket ${r.package_id}`;
      }
```

Add `package_ids` to the SELECT at line 46 and import `BUNDLE_SIZE`.

`abandoned-reminders/route.ts:48`:

```ts
      const pkgLabel = order.order_type === 'pro' ? 'PRO All-Access'
        : order.order_type === 'bundle' ? 'Paket Bundle 5 Tryout'
        : (order.package_id || 'Paket Tryout');
```

Add `package_ids` is not needed here — the label is fixed.

`riwayat/page.tsx:60`:

```ts
  orderType: 'single' | 'bundle' | 'pro';
```

`riwayat/page.tsx:745`:

```tsx
                              {tx.orderType === 'pro' ? 'Akses PRO'
                                : tx.orderType === 'bundle' ? 'Paket Bundle'
                                : 'Paket Satuan'}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/bundle-order.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payment/history/route.ts src/app/api/payment/abandoned-reminders/route.ts src/app/riwayat/page.tsx tests/bundle-order.test.ts
git commit -m "feat(payment): label bundle orders across history, reminders, and riwayat"
```

---

# Phase 4 — Ship & Verify

### Task 4.1: Full verification before deploy

**Files:** none

- [ ] **Step 1: Run the entire suite**

Run: `npx vitest run`
Expected: all test files PASS, 0 failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds; `/rekap` in route manifest; no type errors.

- [ ] **Step 3: Grep for leftover client prices**

Run: `grep -rn "baseAmount:" src/components/`
Expected: no matches sending an amount in a request body.

- [ ] **Step 4: Grep for the old PRO price in user-facing copy**

Run: `grep -rn "150.000\|150000" src/`
Expected: no user-facing occurrences (server env may still reference the old key name).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: full suite green after pricing restructure"
```

---

### Task 4.2: Deploy and verify live

**Files:** none

- [ ] **Step 1: Push**

```bash
git push origin master
```

- [ ] **Step 2: Wait for the deployment to reach READY**

Poll `get_deployment` until `readyState === 'READY'` and `alias` includes `lolosin.com`.

- [ ] **Step 3: Verify price authority on production**

```bash
curl -s -X POST https://lolosin.com/api/payment/create-order \
  -H 'Content-Type: application/json' \
  -d '{"orderType":"pro","baseAmount":1}'
```

Expected: `baseAmount` in the response is **59000**, not 1.

- [ ] **Step 4: Verify unknown orderType is rejected**

```bash
curl -s -o /dev/null -w '%{http_code}' -X POST https://lolosin.com/api/payment/create-order \
  -H 'Content-Type: application/json' -d '{"orderType":"free"}'
```

Expected: `400`.

- [ ] **Step 5: Verify the PRO gate**

```bash
curl -s -o /dev/null -w '%{http_code}' https://lolosin.com/api/pro/recap
```

Expected: `401` (no session cookie).

- [ ] **Step 6: Verify the new prices appear in the UI**

`curl -s https://lolosin.com` — grep for `59000` in the layout schema and confirm `G-FR0BKC6GX3` is still present (the GA4 integration from the previous release must not regress).

---

## Notes for executors

- **Finding 6 matters more than the price change.** 65 of 71 orders expired unpaid. Phase 0 and Phase 3 fix correctness; conversion is a separate problem (checkout friction, 3-hour `expires_at`, no payment retry) and is intentionally out of scope here.
- **Do not reorder Phase 0.** Shipping a new price table while `baseAmount` is still client-controlled would produce the same corruption at a different number.
- **Task 3.4 is the highest-risk task.** The webhook and sync paths currently behave oppositely for unknown order types; both must be edited in the same commit or one path will grant PRO for a bundle price.
- **Never print `DATABASE_URL`, `ADMIN_PIN`, `KLIKQRIS_API_KEY`, `JWT_SECRET`, or `SMTP_PASS`.** Use `[REDACTED]` in any output.
