# Riwayat Pembelian Paket, Paket Aktif & Manajemen Transaksi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the `/riwayat` page into a comprehensive dual-tab dashboard featuring Tryout Exam History and Package Purchase History (active packages, transactions filtered by status: pending, berhasil, gagal, expired/batal), with manual payment verification and cancel options.

**Architecture:** 
1. Build a new authenticated API endpoint `/api/payment/history` to query user transactions (`payment_orders`), active packages, and PRO status directly from PostgreSQL Neon.
2. Build an API endpoint `/api/payment/cancel` allowing users to cancel pending orders and free unique codes.
3. Transform `/riwayat` page into a tabbed interface ("Riwayat Tryout" and "Riwayat Pembelian & Paket") with clear status filters (`semua`, `berhasil`, `pending`, `batal / gagal`), package badge list (PRO & individual unlocked packages), and direct action buttons (Pay/Resume pending order, Cancel order, Re-check verification).

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Neon PostgreSQL (`getDb()`), Phosphor Icons (`@phosphor-icons/react`), Vitest for TDD.

**Spec:** Requirement from user: *"tambahin di menu riwayat beli paket, paket aktif, pending transaksi, gagal, berhasil, cancel dan yang lain biar lengkap"*.

---

## Global Constraints

- Design System: Follow Claude Amber theme (`#faf9f5` background, `#c96442` primary, light mode only).
- Icons: Strictly Phosphor Icons (`@phosphor-icons/react`). NO `lucide-react`.
- White-label: Never mention "Saweria" in public user-facing copy (use "QRIS / Pembayaran").
- TDD: Every new endpoint or core logic must have unit tests in `tests/` before implementation.
- All test suites must pass (233+ tests).

## Review Focus

1. **Unauthenticated user accessing `/api/payment/history`**: Return HTTP 401 with `{ error: 'Unauthorized' }` rather than crashing.
2. **Expired pending orders**: Automatically marked or treated as `expired` if `expires_at < NOW()` when fetching history.
3. **Cancel order permission**: Ensure user can only cancel their own order where `status = 'pending'`, preventing cancelling already `paid` orders.
4. **Duplicate package unlock display**: Deduplicate package IDs if user owns both individual package and active PRO bundle.
5. **Resume payment for pending order**: When user clicks "Bayar Sekarang" on a pending order from history, open `UpgradeProModal` or QR modal pre-filled with that order's exact amount and instructions.

---

### Task 1: API Endpoint `/api/payment/history` (GET)

**Files:**
- Create: `src/app/api/payment/history/route.ts`
- Test: `tests/payment-history.test.ts`

**Interfaces:**
- Consumes: `cookies().get('cpns_token')`, `verifyToken(token)`, Neon `getDb()`
- Produces: 
  ```typescript
  {
    success: boolean;
    isPro: boolean;
    proActivatedAt: string | null;
    activePackages: Array<{ packageId: string; title: string; unlockedAt?: string }>;
    transactions: Array<{
      id: number;
      orderType: 'single' | 'pro';
      packageId: string | null;
      packageTitle: string;
      baseAmount: number;
      uniqueCode: number;
      exactAmount: number;
      status: 'pending' | 'paid' | 'cancelled' | 'expired';
      createdAt: string;
      expiresAt: string;
      paidAt: string | null;
    }>;
  }
  ```

- [ ] **Step 1: Write the failing tests**

Create `tests/payment-history.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (name === 'cpns_token' ? { value: 'mock-valid-token' } : null),
  }),
}));

vi.mock('@/lib/auth', () => ({
  verifyToken: async (token: string) => {
    if (token === 'mock-valid-token') {
      return { userId: 'user-uuid-123', email: 'test@example.com' };
    }
    return null;
  },
}));

import { GET } from '@/app/api/payment/history/route';

describe('GET /api/payment/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when token is missing or invalid', async () => {
    const { cookies } = await import('next/headers');
    vi.spyOn(cookies(), 'get').mockReturnValueOnce(undefined as any);

    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns user active packages and transaction history', async () => {
    // 1. User profile query
    mockSql.mockResolvedValueOnce([
      {
        id: 'user-uuid-123',
        email: 'test@example.com',
        is_pro: true,
        pro_activated_at: '2026-10-01T00:00:00Z',
        unlocked_packages: ['tryout-1', 'tryout-2'],
      },
    ]);

    // 2. Packages list query (for labels)
    mockSql.mockResolvedValueOnce([
      { id: 'tryout-1', title: 'Paket Tryout SKD 01' },
      { id: 'tryout-2', title: 'Paket Tryout SKD 02' },
    ]);

    // 3. Transactions query from payment_orders
    mockSql.mockResolvedValueOnce([
      {
        id: 101,
        order_type: 'pro',
        package_id: null,
        base_amount: 1000,
        unique_code: 15,
        exact_amount: 1015,
        status: 'paid',
        created_at: '2026-10-02T10:00:00Z',
        expires_at: '2026-10-02T12:00:00Z',
        paid_at: '2026-10-02T10:05:00Z',
      },
      {
        id: 99,
        order_type: 'single',
        package_id: 'tryout-1',
        base_amount: 1000,
        unique_code: 88,
        exact_amount: 1088,
        status: 'pending',
        created_at: '2026-10-04T10:00:00Z',
        expires_at: '2026-10-04T12:00:00Z',
        paid_at: null,
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.isPro).toBe(true);
    expect(data.transactions).toHaveLength(2);
    expect(data.transactions[0].id).toBe(101);
    expect(data.transactions[0].status).toBe('paid');
    expect(data.transactions[1].status).toBe('pending');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/payment-history.test.ts`
Expected: FAIL ("Cannot find module '@/app/api/payment/history/route'")

- [ ] **Step 3: Write minimal implementation**

Create `src/app/api/payment/history/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const token = cookies().get('cpns_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 1. Fetch user data
    const userRows = await sql`
      SELECT id, email, is_pro, pro_activated_at, unlocked_packages
      FROM users
      WHERE id = ${payload.userId}
      LIMIT 1
    `;

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userRows[0];
    const unlockedPkgIds: string[] = Array.isArray(user.unlocked_packages) ? user.unlocked_packages : [];

    // 2. Fetch package titles for formatting
    const pkgRows = await sql`
      SELECT id, title FROM packages
    `;
    const titleMap = new Map<string, string>();
    for (const p of pkgRows) {
      titleMap.set(p.id, p.title);
    }

    // 3. Query transactions for this user (or matching user email)
    const orderRows = await sql`
      SELECT 
        id, order_type, package_id, base_amount, unique_code, exact_amount,
        status, created_at, expires_at, paid_at
      FROM payment_orders
      WHERE user_id = ${payload.userId}
         OR (user_email IS NOT NULL AND LOWER(user_email) = LOWER(${user.email || ''}))
      ORDER BY created_at DESC
    `;

    const now = new Date();
    const transactions = orderRows.map((r: any) => {
      let finalStatus = r.status;
      if (r.status === 'pending' && r.expires_at && new Date(r.expires_at) < now) {
        finalStatus = 'expired';
      }

      let packageTitle = 'Paket Member PRO (Akses Semua Tryout)';
      if (r.order_type === 'single' && r.package_id) {
        packageTitle = titleMap.get(r.package_id) || `Paket ${r.package_id}`;
      }

      return {
        id: r.id,
        orderType: r.order_type,
        packageId: r.package_id,
        packageTitle,
        baseAmount: Number(r.base_amount),
        uniqueCode: Number(r.unique_code),
        exactAmount: Number(r.exact_amount),
        status: finalStatus,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        paidAt: r.paid_at,
      };
    });

    const activePackages = unlockedPkgIds.map((pkgId) => ({
      packageId: pkgId,
      title: titleMap.get(pkgId) || `Paket ${pkgId}`,
    }));

    return NextResponse.json({
      success: true,
      isPro: Boolean(user.is_pro),
      proActivatedAt: user.pro_activated_at,
      activePackages,
      transactions,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/payment-history.test.ts`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payment/history/route.ts tests/payment-history.test.ts
git commit -m "feat(api): add /api/payment/history endpoint with package and transaction listing"
```

---

### Task 2: API Endpoint `/api/payment/cancel` (POST)

**Files:**
- Create: `src/app/api/payment/cancel/route.ts`
- Test: `tests/payment-cancel.test.ts`

**Interfaces:**
- Consumes: `{ orderId: number }` from JSON body, verified user session
- Produces: `{ success: true, message: string }` or error

- [ ] **Step 1: Write the failing tests**

Create `tests/payment-cancel.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (name === 'cpns_token' ? { value: 'valid-token' } : null),
  }),
}));

vi.mock('@/lib/auth', () => ({
  verifyToken: async (token: string) => {
    if (token === 'valid-token') return { userId: 'user-1', email: 'u1@test.com' };
    return null;
  },
}));

import { POST } from '@/app/api/payment/cancel/route';

describe('POST /api/payment/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated request', async () => {
    const { cookies } = await import('next/headers');
    vi.spyOn(cookies(), 'get').mockReturnValueOnce(undefined as any);

    const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderId: 10 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('cancels a pending order owned by the user', async () => {
    // 1. Find order
    mockSql.mockResolvedValueOnce([
      { id: 10, user_id: 'user-1', user_email: 'u1@test.com', status: 'pending' },
    ]);
    // 2. Update order
    mockSql.mockResolvedValueOnce([]);

    const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderId: 10 }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('refuses to cancel an order that is already paid', async () => {
    mockSql.mockResolvedValueOnce([
      { id: 10, user_id: 'user-1', user_email: 'u1@test.com', status: 'paid' },
    ]);

    const req = new NextRequest('http://localhost:3000/api/payment/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderId: 10 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/payment-cancel.test.ts`
Expected: FAIL ("Cannot find module '@/app/api/payment/cancel/route'")

- [ ] **Step 3: Write minimal implementation**

Create `src/app/api/payment/cancel/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('cpns_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = Number(body.orderId);
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Verify order ownership and status
    const rows = await sql`
      SELECT id, user_id, user_email, status
      FROM payment_orders
      WHERE id = ${orderId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    const order = rows[0];
    const isOwner = order.user_id === payload.userId || 
      (order.user_email && payload.email && order.user_email.toLowerCase() === payload.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `Pesanan dengan status ${order.status} tidak dapat dibatalkan.` },
        { status: 400 }
      );
    }

    await sql`
      UPDATE payment_orders
      SET status = 'cancelled',
          expires_at = NOW()
      WHERE id = ${orderId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Pesanan berhasil dibatalkan.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/payment-cancel.test.ts`
Expected: PASS (3 tests passed)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payment/cancel/route.ts tests/payment-cancel.test.ts
git commit -m "feat(api): add /api/payment/cancel endpoint for user-initiated order cancellation"
```

---

### Task 3: Redesign `/riwayat` Page with Dual Tabs & Filters

**Files:**
- Modify: `src/app/riwayat/page.tsx`

**Features to implement in `/riwayat`:**
1. **Dual Main Tabs**:
   - Tab 1: **"Riwayat Tryout"** (existing exam history & drafts, polished)
   - Tab 2: **"Paket & Transaksi"** (new active packages overview + transaction history)
2. **Paket Aktif Showcase**:
   - If `isPro`: Gold/Amber banner with crown badge "Member PRO Aktif (Akses Semua 19+ Paket Tryout)" + activation date.
   - If individual packages: List of unlocked tryout cards with a quick "Mulai Tryout" button.
   - If no packages: Friendly banner "Belum ada paket aktif. Beli paket atau upgrade PRO untuk membuka semua simulasi." + button to `/simulasi`.
3. **Filter Tabs for Transactions**:
   - `Semua` (All)
   - `Berhasil` (Paid) — green badge
   - `Pending` (Menunggu Pembayaran) — amber badge with remaining countdown or pay action
   - `Batal / Gagal` (Cancelled / Expired) — slate/red badge
4. **Transaction Item Card**:
   - Order ID `#12`
   - Package Title / PRO Membership
   - Nominal + Unique Code details (`Rp 1.015`)
   - Status badge:
     - `PAID`: "Berhasil" + paid date
     - `PENDING`: "Menunggu Pembayaran" + Tombol **"Lanjutkan Bayar"** & **"Batalkan"**
     - `CANCELLED`: "Dibatalkan"
     - `EXPIRED`: "Kedaluwarsa"
   - Quick WhatsApp help link for any problematic order.

- [ ] **Step 1: Update `src/app/riwayat/page.tsx` with complete implementation**

Integrate tab switching, fetch `/api/payment/history`, and allow cancelling / resuming pending orders.

- [ ] **Step 2: Test type checking and build**

Run: `npx next build`
Expected: Zero build/type errors.

- [ ] **Step 3: Run full vitest suite**

Run: `npm test -- --run`
Expected: All tests pass (238+ passed).

- [ ] **Step 4: Commit**

```bash
git add src/app/riwayat/page.tsx
git commit -m "feat(history): add tabbed view for package purchase history, active packages, and transaction management"
```

---

### Task 4: Verification and Smoke Testing

**Files:**
- Verify build, deploy previews, and test coverage

- [ ] **Step 1: Run comprehensive tests**

Run: `npm test -- --run`
Expected: 238+ passed.

- [ ] **Step 2: Run production build check**

Run: `npx next build`
Expected: Success.

- [ ] **Step 3: Commit & Push**

```bash
git push origin master
```

---

## Risks, Tradeoffs, and Open Questions

1. **Guest Users vs Logged-In Users**:
   - Exam history works for guests via `localStorage`.
   - Package purchases require login / account email. If a user is not logged in, the "Paket & Transaksi" tab will prompt: *"Silakan login untuk melihat paket aktif dan riwayat transaksi kamu."* with a direct login button.
2. **Cancelled Order Re-use**:
   - When a pending order is cancelled, setting its `expires_at = NOW()` immediately frees up its random unique code (1-999) so other users or future orders can use it without collision.
3. **Saweria / QRIS Whitelabeling**:
   - All client UI labels use "QRIS / Pembayaran", respecting the brand rules.
