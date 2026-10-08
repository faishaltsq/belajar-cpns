# Implementation Plan: Block Purchase for Pro Users

## Goal
Prevent users who already have Pro status (`is_pro = true`) from triggering the payment/upgrade flow for any tryout package, both in the UI (card click) and at the API level (create-order endpoint).

---

## Current Context & Assumptions

### How "locked" state works
- `src/app/simulasi/page.tsx` fetches `/api/user/status` on mount → gets `{ is_pro, unlocked_packages }`.
- In `renderCard(pkg)`, `isLocked = !isPro && !FREE_IDS.has(pkg.id) && !unlockedPackages.includes(pkg.id)`.
- When `isPro === true`, `isLocked` is already `false` for every package — the locked card branch is never rendered. This means the "Buka Akses" card + `setUpgradeOpen(true)` cannot be triggered from the card list.

### Gap: Modal can still be opened from other surfaces
- `UpgradeProModal` is used across multiple pages (`src/app/simulasi/page.tsx`, `src/app/riwayat/page.tsx`, etc.). A user could reach it from direct page navigation or if `isPro` check in other callers is missing.
- `src/components/UpgradeProModal.tsx` itself has NO guard that checks if the current user is already Pro before showing the payment form and calling `fetchOrder`.

### Gap: API has no guard
- `src/app/api/payment/create-order/route.ts` queries DB only to look for **existing pending orders** (de-dupe logic). It does NOT check if `users.is_pro === true` before creating a new order. A Pro user could bypass the UI and POST directly to this endpoint to create a payment order they will never need to fulfill.

### Scope of fix
1. **`UpgradeProModal`** — guard at mount: if user is already Pro, skip payment steps entirely and show a "Kamu sudah Pro" confirmation screen.
2. **`create-order` API** — add a server-side guard that queries `users.is_pro` before inserting an order, and returns a clear error if the user is already Pro.

---

## Architecture / Proposed Approach
Add the guard at both the UI component (`UpgradeProModal`) and the API (`create-order/route.ts`) for defence in depth.
In `UpgradeProModal`, check `is_pro` from `/api/user/status` during the `isOpen` mount effect — if `true`, immediately set `step = 'already_pro'` and render a non-payment confirmation screen instead of the upgrade flow.
In `create-order/route.ts`, after resolving `userId`, query `users.is_pro` from DB; if `true` and `orderType === 'pro'`, return `{ error: 'ALREADY_PRO' }` with HTTP 409; if user has already unlocked the specific `packageId` (for `orderType === 'single'`), return similarly.

---

## Step-by-Step Tasks

### Task 1: Add `'already_pro'` step to `UpgradeProModal` state type
**File:** `src/components/UpgradeProModal.tsx`

Change the `step` state type from `'info' | 'pay' | 'success'` to include `'already_pro'`:
```tsx
// BEFORE (line ~49)
const [step, setStep] = useState<'info' | 'pay' | 'success'>('info');

// AFTER
const [step, setStep] = useState<'info' | 'pay' | 'success' | 'already_pro'>('info');
```

---

### Task 2: Guard `UpgradeProModal` on open — check if user already Pro
**File:** `src/components/UpgradeProModal.tsx`

Find the `useEffect` that runs when `isOpen` changes (should be near line ~85-100 — look for `if (!isOpen)` early return or `setStep('info')`). Add a Pro check before resetting to info:

```tsx
useEffect(() => {
  if (!isOpen) return;

  // Reset state on open
  setStep('info');
  setOrderInfo(null);
  setErrorMessage('');
  setSelectedPlan('pro');

  // Guard: jika user sudah pro, langsung tampilkan layar konfirmasi
  if (user && !userLoading) {
    fetch('/api/user/status')
      .then(r => r.json())
      .then(d => {
        if (d.is_pro) {
          setStep('already_pro');
        }
      })
      .catch(() => {});
  }
}, [isOpen, user, userLoading]);
```

---

### Task 3: Render `already_pro` screen in `UpgradeProModal`
**File:** `src/components/UpgradeProModal.tsx`

Find the JSX section that switches on `step` (look for `{step === 'success' && ...}` or similar structure). Add a new branch before or alongside `success`:

```tsx
{step === 'already_pro' && (
  <div className="text-center space-y-4 py-4">
    <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-emerald-100 text-emerald-700">
      <Crown size={28} weight="fill" />
    </div>
    <div>
      <h3 className="text-base font-bold text-[var(--foreground)]">Kamu Sudah Pro!</h3>
      <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
        Semua paket tryout sudah terbuka untuk akunmu. Tidak perlu membeli lagi.
      </p>
    </div>
    <button
      onClick={onClose}
      className="btn-primary w-full py-2.5 text-xs font-semibold"
    >
      Tutup
    </button>
  </div>
)}
```

---

### Task 4: Guard API `create-order` — reject Pro user attempting to re-purchase Pro
**File:** `src/app/api/payment/create-order/route.ts`

After the block where `userId` is resolved (around line 34–46, after `userEmail` is fetched), add a DB check:

```ts
// Guard: tolak order baru jika user sudah Pro (orderType = 'pro')
// atau sudah unlock paket tersebut (orderType = 'single')
if (userId) {
  const userRows = await sql`
    SELECT is_pro, unlocked_packages FROM users WHERE id = ${userId} LIMIT 1
  `;
  if (userRows.length > 0) {
    const { is_pro, unlocked_packages } = userRows[0];
    const unlockedArr: string[] = Array.isArray(unlocked_packages) ? unlocked_packages : [];

    if (orderType === 'pro' && is_pro) {
      return NextResponse.json(
        { error: 'ALREADY_PRO', message: 'Akun kamu sudah berstatus Pro. Semua paket sudah terbuka.' },
        { status: 409 }
      );
    }
    if (orderType === 'single' && packageId && unlockedArr.includes(packageId)) {
      return NextResponse.json(
        { error: 'ALREADY_UNLOCKED', message: `Paket ${packageId} sudah terbuka untuk akunmu.` },
        { status: 409 }
      );
    }
  }
}
```

Insert this block **after** the `userEmail` fallback block (after line ~46) and **before** the pending-order de-dupe block (before line ~48).

---

### Task 5: Handle `ALREADY_PRO` / `ALREADY_UNLOCKED` error in `UpgradeProModal.fetchOrder`
**File:** `src/components/UpgradeProModal.tsx`

In `fetchOrder` (around line ~61-80), the `res.json()` handling currently shows a generic `setErrorMessage(data.error)`. Add specific handling for the new error codes:

```tsx
const data = await res.json();
if (data.success) {
  setOrderInfo(data);
} else if (data.error === 'ALREADY_PRO' || data.error === 'ALREADY_UNLOCKED') {
  // Tampilkan layar "sudah pro" alih-alih pesan error merah
  setStep('already_pro');
} else {
  setErrorMessage(data.error || 'Gagal menyiapkan pesanan pembayaran.');
}
```

---

## Tests / Validation

1. **Build check:**
   ```bash
   npm run build
   # Expected: exit 0, no TypeScript errors
   ```

2. **Manual test — Pro user opens locked card:**
   - Log in as a Pro user (or temporarily set `is_pro = true` in DB).
   - Navigate to `/simulasi` — all cards should be unlocked (no "Buka Akses" CTA visible, `isLocked = false`). This already works; verify it still does.

3. **Manual test — Modal guard:**
   - As a Pro user, if `UpgradeProModal` is somehow opened (e.g. direct state manipulation or other page surface), it should immediately show the "Kamu Sudah Pro!" screen without calling `fetchOrder`.

4. **Manual test — API guard (curl):**
   ```bash
   # Logged in as Pro user (replace cookie value)
   curl -X POST https://belajar-cpns-saas.vercel.app/api/payment/create-order \
     -H "Content-Type: application/json" \
     -H "Cookie: cpns_token=<token>" \
     -d '{"orderType":"pro","baseAmount":49000}'
   # Expected: HTTP 409, body: {"error":"ALREADY_PRO","message":"Akun kamu sudah berstatus Pro..."}
   ```

---

## Risks, Tradeoffs, and Open Questions

- **`UpgradeProModal` opened without logged-in user (`user = null`):** The Pro guard in Task 2 only fires if `user && !userLoading`. If no user is logged in, the modal shows the normal flow (which then redirects to login on `fetchOrder`). This is correct behavior.
- **Race condition on modal open:** The guard fetches `/api/user/status` async. For a brief moment the `step` is still `'info'`. The delay is negligible (same-origin API call, <100ms typically) and the modal has a loading spinner during this time anyway.
- **`orderType === 'single'` for Pro users:** A Pro user technically has access to all packages so buying a single package is also unnecessary. Task 4 does NOT block `single` orders for Pro users because `is_pro` already covers all packages; however it DOES block re-purchasing a specific already-unlocked package. If we want to also block `single` for Pro, add: `if (orderType === 'single' && is_pro) { return 409 ALREADY_PRO; }`.
