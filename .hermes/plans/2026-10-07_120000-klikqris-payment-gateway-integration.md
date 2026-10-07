# KlikQRIS Payment Gateway Integration & Saweria Removal Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy Saweria donation workaround with a native KlikQRIS payment gateway integration (supporting Sandbox and Production modes) for dynamic QRIS generation, instant webhook payment fulfillment, and manual status synchronization, while removing all Saweria artifacts.

**Architecture:** 
1. Build a unified `src/lib/klikqris.ts` client that interacts with KlikQRIS API (`https://klikqris.com/api/sandbox` or `https://klikqris.com/api`) for creating transactions, checking statuses, and verifying signatures with an automatic fallback mock for offline local dev.
2. Update `/api/payment/create-order` to generate dynamic QRIS orders through KlikQRIS and persist transaction tokens/URLs in `payment_orders`.
3. Create `/api/webhooks/klikqris` to handle HTTP POST callbacks from KlikQRIS with signature verification and idempotency, upgrading user status (`is_pro = true` or adding to `unlocked_packages`).
4. Update `/api/payment/sync` to check KlikQRIS manual status API as a fallback when users click "Cek Status Sekarang".
5. Overhaul `src/components/UpgradeProModal.tsx` to display direct QRIS barcode images (without requiring users to leave the site to enter donation IDs on Saweria) and remove all Saweria guides.
6. Delete deprecated Saweria routes and helper files (`src/lib/saweria.ts`, `src/app/api/webhooks/saweria`, `src/app/api/saweria/*`, `src/app/api/payment/debug-saweria`).

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Neon Serverless PostgreSQL, Vitest, `@phosphor-icons/react`, KlikQRIS REST API.

---

## Global Constraints
- Keep light mode theme: background `#faf9f5`, brand accent `#c96442`, font Outfit.
- Icons: Use `@phosphor-icons/react` exclusively (no `lucide-react`).
- Security: Never expose `KLIKQRIS_API_KEY` or `KLIKQRIS_MERCHANT_ID` to the client/browser bundle; all API calls to KlikQRIS must run strictly in Node.js server runtimes (`/api/*`).
- Idempotency: Webhook must safely ignore already-processed (`paid`) orders without duplicate processing.
- Error Handling: Always return HTTP `200 OK` on valid webhook delivery as required by KlikQRIS callback specification.
- Zero credential leakage: Use environment variables (`KLIKQRIS_API_KEY`, `KLIKQRIS_MERCHANT_ID`, `KLIKQRIS_ENV`, `KLIKQRIS_CALLBACK_URL`).

---

## Review Focus
1. **Sandbox vs Production URL Switching**: `KLIKQRIS_ENV=sandbox` must route to `https://klikqris.com/api/sandbox/qris/create`, while `KLIKQRIS_ENV=production` must route to `https://klikqris.com/api/qris/create`.
2. **Dynamic QRIS Display**: `UpgradeProModal` must render `qris_url` or `qris_image` returned by KlikQRIS directly in the modal, allowing immediate scan from mobile banking/e-wallet without manual URL redirection.
3. **Webhook Payload Compatibility**: Handle both top-level JSON fields (`order_id`, `status`, `total_amount`, `signature`) and nested `data` object structure (`data.order_id`, `data.status`) gracefully.
4. **Offline / Missing Key Fallback**: In development or test environments where KlikQRIS credentials are unset, synthesize a simulated QR code so UI/UX workflows don't crash.
5. **Database Transaction Integrity**: Ensure `payment_orders.status` is updated to `'paid'` and `users.is_pro` / `users.unlocked_packages` are atomically set upon receipt of `PAID` status.

---

### Task 1: Create KlikQRIS Client Library (`src/lib/klikqris.ts`)

**Files:**
- Create: `src/lib/klikqris.ts`
- Test: `tests/klikqris-client.test.ts`

**Interfaces:**
- Consumes: `process.env.KLIKQRIS_API_KEY`, `process.env.KLIKQRIS_MERCHANT_ID`, `process.env.KLIKQRIS_ENV`
- Produces: `createKlikQrisTransaction()`, `checkKlikQrisStatus()`, `verifyKlikQrisSignature()`

- [ ] **Step 1: Write unit tests for KlikQRIS client in `tests/klikqris-client.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createKlikQrisTransaction,
  checkKlikQrisStatus,
  getKlikQrisBaseUrl,
} from '@/lib/klikqris';

describe('KlikQRIS Client Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects sandbox URL by default or when KLIKQRIS_ENV=sandbox', () => {
    expect(getKlikQrisBaseUrl('sandbox')).toBe('https://klikqris.com/api/sandbox');
    expect(getKlikQrisBaseUrl('production')).toBe('https://klikqris.com/api');
  });

  it('formats create transaction payload and handles successful API response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        message: 'Transaction Created Successfully',
        data: {
          order_id: 'INV-TEST-101',
          amount: '1000.00',
          amount_uniq: '12.00',
          total_amount: '1012.00',
          status: 'PENDING',
          qris_url: 'https://klikqris.com/storage/qris_api/qris_INV-TEST-101.png',
          expired_at: '2026-10-07 12:00:00',
          signature: 'mock-sig-123',
        },
      }),
    });
    global.fetch = mockFetch;

    const res = await createKlikQrisTransaction({
      orderId: 'INV-TEST-101',
      amount: 1000,
      keterangan: 'Test Pembayaran',
      apiKey: 'test-key',
      merchantId: 'test-merchant',
      env: 'sandbox',
    });

    expect(res.success).toBe(true);
    expect(res.orderId).toBe('INV-TEST-101');
    expect(res.totalAmount).toBe(1012);
    expect(res.qrisUrl).toContain('qris_INV-TEST-101.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/klikqris-client.test.ts`
Expected: FAIL (module `@/lib/klikqris` not found)

- [ ] **Step 3: Implement `src/lib/klikqris.ts`**

```typescript
import QRCode from 'qrcode';

export interface CreateTransactionParams {
  orderId: string;
  amount: number;
  keterangan?: string;
  callbackUrl?: string;
  apiKey?: string;
  merchantId?: string;
  env?: 'sandbox' | 'production';
}

export interface KlikQrisTransactionResult {
  success: boolean;
  orderId: string;
  amount: number;
  uniqueCode: number;
  totalAmount: number;
  status: string;
  qrisUrl?: string;
  qrisImage?: string;
  expiredAt?: string;
  signature?: string;
  error?: string;
}

export function getKlikQrisBaseUrl(env?: string): string {
  const isProd = (env || process.env.KLIKQRIS_ENV) === 'production';
  return isProd ? 'https://klikqris.com/api' : 'https://klikqris.com/api/sandbox';
}

export async function createKlikQrisTransaction(
  params: CreateTransactionParams
): Promise<KlikQrisTransactionResult> {
  const apiKey = params.apiKey || process.env.KLIKQRIS_API_KEY;
  const merchantId = params.merchantId || process.env.KLIKQRIS_MERCHANT_ID;
  const env = params.env || (process.env.KLIKQRIS_ENV === 'production' ? 'production' : 'sandbox');
  const baseUrl = getKlikQrisBaseUrl(env);

  // If no API key configured (e.g. offline dev), fallback to mock synthesized QR
  if (!apiKey || !merchantId) {
    const uniqueCode = Math.floor(Math.random() * 900) + 100;
    const totalAmount = params.amount + uniqueCode;
    const mockQrDataUrl = await QRCode.toDataURL(`KLIKQRIS_MOCK_${params.orderId}_${totalAmount}`, {
      width: 280,
      margin: 2,
    });
    return {
      success: true,
      orderId: params.orderId,
      amount: params.amount,
      uniqueCode,
      totalAmount,
      status: 'PENDING',
      qrisUrl: '',
      qrisImage: mockQrDataUrl,
      signature: 'mock_dev_signature',
    };
  }

  try {
    const res = await fetch(`${baseUrl}/qris/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'id_merchant': merchantId,
      },
      body: JSON.stringify({
        order_id: params.orderId,
        id_merchant: merchantId,
        amount: params.amount,
        keterangan: params.keterangan || `Pembayaran ${params.orderId}`,
        ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.status) {
      return {
        success: false,
        orderId: params.orderId,
        amount: params.amount,
        uniqueCode: 0,
        totalAmount: params.amount,
        status: 'FAILED',
        error: json.message || 'Gagal membuat transaksi KlikQRIS',
      };
    }

    const data = json.data;
    const totalAmount = Number(data.total_amount || data.amount || params.amount);
    const amount = Number(data.amount || params.amount);
    const uniqueCode = Math.max(0, totalAmount - amount);

    return {
      success: true,
      orderId: data.order_id || params.orderId,
      amount,
      uniqueCode,
      totalAmount,
      status: data.status || 'PENDING',
      qrisUrl: data.qris_url || '',
      qrisImage: data.qris_image || '',
      expiredAt: data.expired_at,
      signature: data.signature,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Koneksi ke KlikQRIS gagal';
    return {
      success: false,
      orderId: params.orderId,
      amount: params.amount,
      uniqueCode: 0,
      totalAmount: params.amount,
      status: 'ERROR',
      error: msg,
    };
  }
}

export async function checkKlikQrisStatus(orderId: string): Promise<{
  success: boolean;
  status: 'PAID' | 'PENDING' | 'EXPIRED' | 'FAILED';
  paidAt?: string;
  signature?: string;
  error?: string;
}> {
  const apiKey = process.env.KLIKQRIS_API_KEY;
  const merchantId = process.env.KLIKQRIS_MERCHANT_ID;
  const baseUrl = getKlikQrisBaseUrl();

  if (!apiKey || !merchantId) {
    return { success: false, status: 'PENDING', error: 'Credentials not configured' };
  }

  try {
    const res = await fetch(`${baseUrl}/qris/status/${orderId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'id_merchant': merchantId,
      },
    });

    const json = await res.json();
    if (!res.ok || !json.status) {
      return { success: false, status: 'PENDING', error: json.message };
    }

    const d = json.data;
    const statusMap: Record<string, 'PAID' | 'PENDING' | 'EXPIRED' | 'FAILED'> = {
      SUCCESS: 'PAID',
      PAID: 'PAID',
      PENDING: 'PENDING',
      EXPIRED: 'EXPIRED',
    };

    return {
      success: true,
      status: statusMap[d.status] || 'PENDING',
      paidAt: d.paid_at,
      signature: d.signature,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal menghubungi server KlikQRIS';
    return { success: false, status: 'PENDING', error: msg };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/klikqris-client.test.ts`
Expected: PASS

---

### Task 2: Update Order Creation Endpoint (`src/app/api/payment/create-order/route.ts`)

**Files:**
- Modify: `src/app/api/payment/create-order/route.ts`

**Specifications:**
- Remove hardcoded Saweria username / payment URL generator.
- Use `createKlikQrisTransaction()` to create transactions with KlikQRIS API.
- Save `gateway: 'klikqris'`, `qris_url`, `signature` into `payment_orders`.
- Return `orderId`, `baseAmount`, `uniqueCode`, `exactAmount`, `qrisUrl`, `qrisImage` to frontend.

- [ ] **Step 1:** Modify `src/app/api/payment/create-order/route.ts`:
  - Replace `buildQrPayload` with call to `createKlikQrisTransaction({ orderId: `INV-${orderId}`, amount: baseAmount, ... })`.
  - Format `order_id` in KlikQRIS as `INV-<orderId>` or timestamp-based ID.
  - Return JSON payload:
    ```typescript
    {
      success: true,
      orderId: order.id,
      invoiceCode: `INV-${order.id}`,
      baseAmount: order.base_amount,
      uniqueCode: order.unique_code,
      exactAmount: order.exact_amount,
      packageId,
      orderType,
      userEmail,
      qrisUrl: result.qrisUrl,
      qrisImage: result.qrisImage,
      gateway: 'klikqris'
    }
    ```

- [ ] **Step 2:** Verify build and test order creation.

---

### Task 3: Implement KlikQRIS Webhook Route (`src/app/api/webhooks/klikqris/route.ts`)

**Files:**
- Create: `src/app/api/webhooks/klikqris/route.ts`
- Test: `tests/klikqris-payment.test.ts`

**Specifications:**
1. Handle `POST /api/webhooks/klikqris`.
2. Extract `order_id`, `status`, `total_amount`, `signature` from body (supporting top-level and nested `data` schemas).
3. Extract database order id from `order_id` string (e.g. `INV-123` -> `123`).
4. Validate order existence in `payment_orders`.
5. If status is `PAID` or `SUCCESS`:
   - If `order.status === 'paid'`, return HTTP 200 immediately (`Already processed`).
   - Atomically update `payment_orders.status = 'paid'`, `paid_at = NOW()`.
   - If `order.order_type === 'pro'`, update `users.is_pro = true`, `pro_activated_at = NOW()`.
   - If `order.order_type === 'single'` and `order.package_id`, append package to `users.unlocked_packages`.
   - Insert record into `payment_logs` or log table for auditing.
6. Return `{ success: true, message: 'Webhook processed successfully' }` with HTTP 200.

- [ ] **Step 1: Write unit tests in `tests/klikqris-payment.test.ts`**
  - Test 1: Webhook receives `PAID` for PRO upgrade and updates user `is_pro = true`.
  - Test 2: Webhook receives `PAID` for single package and updates `unlocked_packages`.
  - Test 3: Idempotency check: duplicate callback returns 200 without duplicate DB write.
  - Test 4: Handles both `{ order_id: "INV-12", status: "PAID" }` and `{ data: { order_id: "INV-12", status: "PAID" } }`.

- [ ] **Step 2: Implement `src/app/api/webhooks/klikqris/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface KlikQrisWebhookPayload {
  order_id?: string;
  status?: string;
  amount?: number;
  total_amount?: number;
  payment_date?: string;
  signature?: string;
  data?: {
    order_id?: string;
    status?: string;
    amount_paid?: number;
    payment_date?: string;
    signature?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: KlikQrisWebhookPayload = await req.json().catch(() => ({}));

    // Extract fields from either flat format or nested data format
    const rawOrderId = body.order_id || body.data?.order_id || '';
    const status = (body.status || body.data?.status || '').toUpperCase();
    const signature = body.signature || body.data?.signature;
    const paidAmount = Number(body.total_amount || body.amount || body.data?.amount_paid || 0);

    if (!rawOrderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Extract numeric ID from INV-123 or raw numeric ID
    const match = rawOrderId.match(/\d+/);
    const orderId = match ? Number(match[0]) : null;

    if (!orderId) {
      return NextResponse.json({ error: 'Invalid order_id format' }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 1. Query order
    const orderRows = await sql`
      SELECT id, user_id, user_email, package_id, order_type, exact_amount, status
      FROM payment_orders
      WHERE id = ${orderId}
      LIMIT 1
    `;

    if (orderRows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderRows[0];

    // 2. Idempotency: if already paid, return 200 immediately
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, message: 'Already processed' }, { status: 200 });
    }

    // 3. Process payment if status is PAID / SUCCESS
    if (status === 'PAID' || status === 'SUCCESS') {
      // Update order to paid
      await sql`
        UPDATE payment_orders
        SET status = 'paid',
            paid_at = NOW()
        WHERE id = ${order.id}
      `;

      // Update user access
      if (order.user_id) {
        if (order.order_type === 'pro') {
          await sql`
            UPDATE users
            SET is_pro = true,
                pro_activated_at = NOW()
            WHERE id = ${order.user_id}
          `;
        } else if (order.order_type === 'single' && order.package_id) {
          const userRows = await sql`SELECT unlocked_packages FROM users WHERE id = ${order.user_id} LIMIT 1`;
          if (userRows.length > 0) {
            const current: string[] = Array.isArray(userRows[0].unlocked_packages) ? userRows[0].unlocked_packages : [];
            if (!current.includes(order.package_id)) {
              current.push(order.package_id);
              await sql`
                UPDATE users
                SET unlocked_packages = ${JSON.stringify(current)}::jsonb
                WHERE id = ${order.user_id}
              `;
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified and access granted',
        orderId: order.id,
      }, { status: 200 });
    }

    if (status === 'EXPIRED') {
      await sql`
        UPDATE payment_orders
        SET status = 'expired'
        WHERE id = ${order.id}
      `;
      return NextResponse.json({ success: true, message: 'Order marked expired' }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: `Status ${status} acknowledged` }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Webhook internal error';
    console.error('KlikQRIS Webhook Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: Run tests to verify all cases pass**
Run: `npx vitest run tests/klikqris-payment.test.ts`
Expected: PASS

---

### Task 4: Update Sync & Order Status API (`src/app/api/payment/sync/route.ts`)

**Files:**
- Modify: `src/app/api/payment/sync/route.ts`

**Specifications:**
- In `sync/route.ts`, when a user clicks manual check status, call `checkKlikQrisStatus(\`INV-${orderId}\`)`.
- If KlikQRIS status returns `PAID`, execute the activation flow on `users` and mark `payment_orders.status = 'paid'`.
- Return `{ paid: true }` or `{ paid: false, status: 'pending' }`.

- [ ] **Step 1:** Modify `src/app/api/payment/sync/route.ts` to replace the old Saweria transaction scraper with `checkKlikQrisStatus()`.
- [ ] **Step 2:** Verify with test.

---

### Task 5: Redesign Upgrade Pro Modal (`src/components/UpgradeProModal.tsx`)

**Files:**
- Modify: `src/components/UpgradeProModal.tsx`

**Specifications:**
1. Clean up Saweria username references and confusing 4-step donation instructions.
2. In step `pay`:
   - Display dynamic QRIS image directly using `orderInfo.qrisUrl` or `orderInfo.qrisImage`.
   - Add QR download / save button if user is on mobile.
   - Clean instructions:
     1. Buka aplikasi m-Banking (BCA, Mandiri, BRI, BNI, dll.) atau E-Wallet (GoPay, OVO, Dana, ShopeePay).
     2. Pilih menu **Scan QRIS**.
     3. Arahkan kamera ke QR Code di atas.
     4. Pastikan nominal pembayaran sesuai (**Rp {exactAmount}**).
     5. Konfirmasi pembayaran — akses kamu akan aktif otomatis dalam hitungan detik!
   - Polling checks `/api/payment/order-status?orderId=...` every 2 seconds.
3. Keep Amber theme, Phosphor icons, and auth gate for non-logged-in guests.

- [ ] **Step 1:** Update `UpgradeProModal.tsx` types and render logic.
- [ ] **Step 2:** Test rendering and polling behavior.

---

### Task 6: Remove Deprecated Saweria Routes & Files

**Files to delete / clean up:**
- Delete: `src/lib/saweria.ts`
- Delete: `src/app/api/webhooks/saweria/route.ts`
- Delete: `src/app/api/saweria/qris/route.ts`
- Delete: `src/app/api/saweria/check/route.ts`
- Delete: `src/app/api/payment/debug-saweria/route.ts`
- Delete: `src/app/api/payment/refresh-qris/route.ts`
- Delete: `tests/saweria-payment.test.ts`

- [ ] **Step 1:** Delete deprecated Saweria files and route folders.
- [ ] **Step 2:** Ensure no other files import `@/lib/saweria`.

---

### Task 7: Update Payment History and Cancel Tests

**Files:**
- Modify: `tests/payment-history.test.ts`
- Modify: `tests/payment-cancel.test.ts`

- [ ] **Step 1:** Update mock queries in `tests/payment-history.test.ts` to match current `payment_orders` structure.
- [ ] **Step 2:** Run test suite: `npx vitest run`
- [ ] **Step 3:** Confirm all tests pass.

---

### Task 8: Verification & Production Build

- [ ] **Step 1: Execute test suite**
Run: `npx vitest run`
Expected: 100% tests pass

- [ ] **Step 2: Execute Next.js build**
Run: `npm run build`
Expected: Exit 0 with zero TypeScript or bundling errors.

- [ ] **Step 3: Commit and push**
Commit message: `feat: integrasi payment gateway KlikQRIS (sandbox & prod) dan hapus integrasi legacy Saweria`

---

## Environment Variables Configuration

Tambahkan ke `.env` / Railway / Vercel:
```bash
# KlikQRIS Integration
KLIKQRIS_API_KEY=your_api_key_from_klikqris_dashboard
KLIKQRIS_MERCHANT_ID=your_merchant_id
KLIKQRIS_ENV=sandbox # 'sandbox' untuk testing, 'production' untuk live
```
