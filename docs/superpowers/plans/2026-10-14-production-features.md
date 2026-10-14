# Production Readiness & Growth Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement four high-impact production features: viral exam result sharing (WhatsApp + Web Share API), PWA installation support with web manifest, automated abandoned-cart payment reminders via email, and polished manual payment verification feedback.

**Architecture:** 
- The result page gains a dedicated `ShareResultModal` & action buttons utilizing Web Share API with WhatsApp / clipboard fallbacks.
- PWA setup adds `/manifest.json`, apple-touch-icon, and viewport/theme declarations in `src/app/layout.tsx`.
- The payment subsystem gains an abandoned cart reminder helper (`src/lib/abandonedReminder.ts`) and a secured cron endpoint (`src/app/api/payment/abandoned-reminders/route.ts`) leveraging nodemailer.
- `UpgradeProModal.tsx` replaces disruptive browser `alert()` popups with responsive inline status banners during manual status synchronization.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, @phosphor-icons/react, Vitest, Nodemailer.

**Spec:** User directive for production readiness: "gaslah semuanya kalau domainnya nanti dulu" covering manual payment check, shareable results, abandoned cart reminders, and PWA setup.

## Global Constraints
- **Brand Colors:** Claude Amber theme (`#faf9f5` background, `#c96442` primary accent, Outfit font).
- **Icons:** Use `@phosphor-icons/react` only. Do not use `lucide-react` or decorative emojis in simulation UI.
- **Year Reference:** Standardize on CPNS 2027.
- **Privacy & Security:** Do not expose sensitive credentials, API keys, or raw customer IDs in shared payloads.
- **TDD Requirement:** Strict Vitest test cycles for all business logic helpers.

## Review Focus
1. **Web Share API Unavailability:** In desktop browsers or unsecure origins where `navigator.share` is undefined, the share button must seamlessly fall back to WhatsApp URL opening and clipboard copy without crashing.
2. **Result Data Missing in Share:** If a guest user visits `/simulasi/hasil/[resultId]` directly without stored state, the share action must be disabled or show a graceful fallback message instead of sharing `NaN` or `undefined`.
3. **PWA Manifest Validity:** Manifest must specify correct MIME types and relative icon URLs so Chromium and iOS Safari parse it without console warnings.
4. **Abandoned Cart Spam Prevention:** Reminders must only be sent once per order, restricted to orders created between 1 hour and 24 hours ago, and skip already paid or expired orders.
5. **Payment Manual Sync State:** If an order status check fails or returns still pending, the modal UI must display helpful inline error feedback without closing or resetting the user's QRIS view.

---

### Task 1: Share Exam Result (WhatsApp & Web Share API)

**Files:**
- Create: `src/lib/shareResult.ts`
- Create: `tests/share-result.test.ts`
- Modify: `src/app/simulasi/hasil/[resultId]/page.tsx`

**Interfaces:**
- Produces: `generateShareText(params: ShareTextParams): string`
- Produces: `getWhatsAppShareUrl(text: string): string`

- [ ] **Step 1: Write the failing test for share text generation**

Create `tests/share-result.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateShareText, getWhatsAppShareUrl } from '../src/lib/shareResult';

describe('Exam Result Share Helper', () => {
  it('generates well-formatted share text for passing score', () => {
    const text = generateShareText({
      tryoutLabel: 'Tryout 1',
      totalScore: 420,
      twk: 95,
      tiu: 130,
      tkp: 195,
      isPassedAll: true,
      siteUrl: 'https://belajar-cpns-saas.vercel.app',
    });

    expect(text).toContain('Lolos.in');
    expect(text).toContain('Tryout 1');
    expect(text).toContain('420/550');
    expect(text).toContain('LOLOS');
    expect(text).toContain('TWK: 95 | TIU: 130 | TKP: 195');
    expect(text).toContain('https://belajar-cpns-saas.vercel.app');
  });

  it('generates share text for not passing score', () => {
    const text = generateShareText({
      tryoutLabel: 'Tryout Mini',
      totalScore: 280,
      twk: 50,
      tiu: 70,
      tkp: 160,
      isPassedAll: false,
    });

    expect(text).toContain('280/550');
    expect(text).toContain('BELUM MEMENUHI');
  });

  it('generates valid WhatsApp click-to-chat URL', () => {
    const url = getWhatsAppShareUrl('Halo Lolos.in');
    expect(url).toBe('https://api.whatsapp.com/send?text=Halo%20Lolos.in');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/share-result.test.ts`
Expected: FAIL with module `shareResult` not found.

- [ ] **Step 3: Implement `src/lib/shareResult.ts`**

Create `src/lib/shareResult.ts`:
```typescript
export interface ShareTextParams {
  tryoutLabel: string;
  totalScore: number;
  twk: number;
  tiu: number;
  tkp: number;
  isPassedAll: boolean;
  siteUrl?: string;
}

export function generateShareText({
  tryoutLabel,
  totalScore,
  twk,
  tiu,
  tkp,
  isPassedAll,
  siteUrl = 'https://belajar-cpns-saas.vercel.app/simulasi',
}: ShareTextParams): string {
  const statusEmoji = isPassedAll ? '🎉' : '💪';
  const statusText = isPassedAll ? 'LOLOS PASSING GRADE' : 'BELUM MEMENUHI PASSING GRADE';

  return (
    `${statusEmoji} Hasil Simulasi CAT SKD CPNS 2027 di Lolos.in!\n\n` +
    `Paket: ${tryoutLabel}\n` +
    `Total Skor: ${totalScore}/550\n` +
    `Rincian: TWK: ${twk} | TIU: ${tiu} | TKP: ${tkp}\n` +
    `Status: ${statusText}\n\n` +
    `Coba simulasi gratis standar BKN sekarang di:\n${siteUrl}`
  );
}

export function getWhatsAppShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/share-result.test.ts`
Expected: PASS (3 tests passed).

- [ ] **Step 5: Integrate Share Buttons into `src/app/simulasi/hasil/[resultId]/page.tsx`**

Modify `src/app/simulasi/hasil/[resultId]/page.tsx`:
Add `ShareNetwork`, `WhatsappLogo`, `Copy` icons from `@phosphor-icons/react`.
Add state `[shareCopied, setShareCopied] = useState(false);`
In the CTA actions container (under the score/print button), add:
```tsx
{/* Tombol Bagikan Hasil */}
<div className="flex flex-col sm:flex-row gap-2 pt-2">
  <button
    type="button"
    onClick={async () => {
      if (!result) return;
      const shareText = generateShareText({
        tryoutLabel: tryoutId ? tryoutId.toUpperCase() : 'Simulasi SKD',
        totalScore: result.totalScore,
        twk: result.twk.score,
        tiu: result.tiu.score,
        tkp: result.tkp.score,
        isPassedAll: result.isPassedAll,
      });

      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: 'Hasil Simulasi CAT SKD CPNS 2027 - Lolos.in',
            text: shareText,
            url: window.location.origin,
          });
          return;
        } catch {
          // fallback to whatsapp
        }
      }
      window.open(getWhatsAppShareUrl(shareText), '_blank');
    }}
    className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 px-6 text-sm"
    style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
  >
    <WhatsappLogo size={18} weight="fill" />
    Bagikan Hasil ke WhatsApp
  </button>

  <button
    type="button"
    onClick={async () => {
      if (!result) return;
      const shareText = generateShareText({
        tryoutLabel: tryoutId ? tryoutId.toUpperCase() : 'Simulasi SKD',
        totalScore: result.totalScore,
        twk: result.twk.score,
        tiu: result.tiu.score,
        tkp: result.tkp.score,
        isPassedAll: result.isPassedAll,
      });
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }}
    className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3 px-6 text-sm"
  >
    <Copy size={16} weight="bold" />
    {shareCopied ? 'Teks Skor Disalin!' : 'Salin Ringkasan Skor'}
  </button>
</div>
```

- [ ] **Step 6: Verify and Commit**

Run: `npm run build`
Commit: `feat(simulasi): tambahkan fitur bagikan hasil ujian ke WhatsApp dan salin ringkasan skor`

---

### Task 2: PWA Support (Web Manifest & App Meta)

**Files:**
- Create: `public/manifest.json`
- Create: `tests/pwa-manifest.test.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write test to validate manifest fields**

Create `tests/pwa-manifest.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA Manifest Configuration', () => {
  it('has valid manifest.json with required fields', () => {
    const manifestPath = path.resolve(__dirname, '../public/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const raw = fs.readFileSync(manifestPath, 'utf8');
    const json = JSON.parse(raw);

    expect(json.name).toContain('Lolos.in');
    expect(json.short_name).toBe('Lolos.in');
    expect(json.start_url).toBe('/simulasi');
    expect(json.display).toBe('standalone');
    expect(json.theme_color).toBe('#c96442');
    expect(json.background_color).toBe('#faf9f5');
    expect(Array.isArray(json.icons)).toBe(true);
    expect(json.icons.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pwa-manifest.test.ts`
Expected: FAIL (`manifest.json` does not exist).

- [ ] **Step 3: Create `public/manifest.json`**

Create `public/manifest.json`:
```json
{
  "name": "Lolos.in — Simulasi CAT SKD CPNS 2027",
  "short_name": "Lolos.in",
  "description": "Platform simulasi ujian CAT SKD CPNS 2027 standar BKN dengan penilaian otomatis TWK, TIU, dan TKP.",
  "start_url": "/simulasi",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#faf9f5",
  "theme_color": "#c96442",
  "categories": ["education", "productivity"],
  "icons": [
    {
      "src": "/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 4: Register manifest in `src/app/layout.tsx`**

In `src/app/layout.tsx`:
Add `manifest: '/manifest.json'` and `appleWebApp` to metadata:
```typescript
export const metadata: Metadata = {
  // ... existing metadata
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lolos.in',
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/pwa-manifest.test.ts`
Expected: PASS (1 test passed).

- [ ] **Step 6: Commit**

Commit: `feat(pwa): tambahkan web app manifest dan konfigurasi installable PWA`

---

### Task 3: Abandoned Cart Payment Reminder Helper & Route

**Files:**
- Create: `src/lib/abandonedReminder.ts`
- Create: `tests/abandoned-reminder.test.ts`
- Create: `src/app/api/payment/abandoned-reminders/route.ts`

**Interfaces:**
- Produces: `isOrderEligibleForReminder(createdAt: Date, status: string, lastRemindedAt?: Date | null): boolean`
- Produces: `buildAbandonedReminderEmail(orderId: number, exactAmount: number, packageLabel: string): { subject: string; html: string }`

- [ ] **Step 1: Write unit test for reminder logic**

Create `tests/abandoned-reminder.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { isOrderEligibleForReminder, buildAbandonedReminderEmail } from '../src/lib/abandonedReminder';

describe('Abandoned Cart Reminder Helper', () => {
  const now = new Date('2026-10-14T10:00:00Z');

  it('rejects orders that are not pending', () => {
    const twoHoursAgo = new Date('2026-10-14T08:00:00Z');
    expect(isOrderEligibleForReminder(twoHoursAgo, 'paid', null, now)).toBe(false);
    expect(isOrderEligibleForReminder(twoHoursAgo, 'expired', null, now)).toBe(false);
  });

  it('rejects orders younger than 1 hour', () => {
    const thirtyMinsAgo = new Date('2026-10-14T09:30:00Z');
    expect(isOrderEligibleForReminder(thirtyMinsAgo, 'pending', null, now)).toBe(false);
  });

  it('rejects orders older than 24 hours', () => {
    const twoDaysAgo = new Date('2026-10-12T08:00:00Z');
    expect(isOrderEligibleForReminder(twoDaysAgo, 'pending', null, now)).toBe(false);
  });

  it('rejects orders already reminded', () => {
    const twoHoursAgo = new Date('2026-10-14T08:00:00Z');
    const reminded = new Date('2026-10-14T08:30:00Z');
    expect(isOrderEligibleForReminder(twoHoursAgo, 'pending', reminded, now)).toBe(false);
  });

  it('accepts pending orders between 1h and 24h old not yet reminded', () => {
    const twoHoursAgo = new Date('2026-10-14T08:00:00Z');
    expect(isOrderEligibleForReminder(twoHoursAgo, 'pending', null, now)).toBe(true);
  });

  it('builds a polite, non-spammy email template', () => {
    const email = buildAbandonedReminderEmail(1024, 150123, 'PRO All-Access');
    expect(email.subject).toContain('Lolos.in');
    expect(email.subject).toContain('PRO All-Access');
    expect(email.html).toContain('Rp 150.123');
    expect(email.html).toContain('#1024');
    expect(email.html).toContain('https://belajar-cpns-saas.vercel.app/simulasi');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/abandoned-reminder.test.ts`
Expected: FAIL (`abandonedReminder` module missing).

- [ ] **Step 3: Implement `src/lib/abandonedReminder.ts`**

Create `src/lib/abandonedReminder.ts`:
```typescript
export function isOrderEligibleForReminder(
  createdAt: Date,
  status: string,
  lastRemindedAt?: Date | null,
  referenceNow: Date = new Date()
): boolean {
  if (status.toLowerCase() !== 'pending') return false;
  if (lastRemindedAt) return false;

  const ageMs = referenceNow.getTime() - createdAt.getTime();
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  return ageMs >= ONE_HOUR_MS && ageMs <= TWENTY_FOUR_HOURS_MS;
}

export function buildAbandonedReminderEmail(
  orderId: number,
  exactAmount: number,
  packageLabel: string,
  appUrl: string = 'https://belajar-cpns-saas.vercel.app/simulasi'
): { subject: string; html: string } {
  const formattedAmount = exactAmount.toLocaleString('id-ID');
  const subject = `[Lolos.in] Selesaikan Akses ${packageLabel} Anda`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #1c1917; line-height: 1.6;">
      <h2 style="color: #c96442; margin-top: 0;">Halo Pejuang NIP,</h2>
      <p>Kami melihat Anda sempat memulai pemesanan untuk paket <strong>${packageLabel}</strong> (Pesanan #${orderId}), namun pembayarannya belum sempat terselesaikan.</p>
      
      <div style="background: #faf9f5; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 13px; color: #78716c;">Total Tagihan Persis (termasuk kode unik):</div>
        <div style="font-size: 24px; font-weight: bold; color: #1c1917; margin: 4px 0 8px 0;">Rp ${formattedAmount}</div>
        <div style="font-size: 12px; color: #a8a29e;">Nominal wajib persis agar verifikasi QRIS otomatis aktif seketika.</div>
      </div>

      <p>Jika Anda masih ingin melanjutkan persiapan ujian CAT SKD CPNS 2027 bersama 34 paket standar BKN dan soal figural lengkap, Anda dapat menyelesaikan pembayaran melalui menu simulasi:</p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}" style="background: #c96442; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Lanjutkan Pembayaran di Lolos.in</a>
      </div>

      <p style="font-size: 12px; color: #a8a29e; border-top: 1px solid #e7e5e4; padding-top: 16px;">
        Abaikan email ini jika Anda sudah menyelesaikan pesanan lain atau tidak berniat melanjutkan. Butuh bantuan? Balas email ini atau hubungi layanan bantuan kami.
      </p>
    </div>
  `;

  return { subject, html };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/abandoned-reminder.test.ts`
Expected: PASS (6 tests passed).

- [ ] **Step 5: Create `/api/payment/abandoned-reminders/route.ts`**

Create `src/app/api/payment/abandoned-reminders/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isOrderEligibleForReminder, buildAbandonedReminderEmail } from '@/lib/abandonedReminder';
import { sendOtpEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Authorize via CRON_SECRET or ADMIN_API_KEY
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Cari pesanan pending dalam rentang 1-24 jam terakhir
    const pendingOrders = await sql`
      SELECT id, user_email, package_id, order_type, exact_amount, status, created_at, last_reminded_at
      FROM payment_orders
      WHERE status = 'pending'
        AND user_email IS NOT NULL
        AND user_email != ''
        AND created_at >= NOW() - INTERVAL '24 hours'
        AND created_at <= NOW() - INTERVAL '1 hour'
        AND last_reminded_at IS NULL
      LIMIT 10
    `;

    let sentCount = 0;

    for (const order of pendingOrders) {
      const createdAt = new Date(order.created_at);
      const isEligible = isOrderEligibleForReminder(
        createdAt,
        order.status,
        order.last_reminded_at ? new Date(order.last_reminded_at) : null
      );

      if (!isEligible) continue;

      const pkgLabel = order.order_type === 'pro' ? 'PRO All-Access' : (order.package_id || 'Paket Tryout');
      const emailContent = buildAbandonedReminderEmail(Number(order.id), Number(order.exact_amount), pkgLabel);

      const sendRes = await sendOtpEmail({
        to: order.user_email,
        subject: emailContent.subject,
        html: emailContent.html,
      });

      if (sendRes.success) {
        await sql`
          UPDATE payment_orders
          SET last_reminded_at = NOW()
          WHERE id = ${order.id}
        `;
        sentCount++;
      }
    }

    return NextResponse.json({
      success: true,
      scanned: pendingOrders.length,
      remindersSent: sentCount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

Commit: `feat(payment): tambahkan helper dan endpoint reminder abandoned cart otomatis`

---

### Task 4: Polish Manual Payment Verification Feedback in `UpgradeProModal`

**Files:**
- Modify: `src/components/UpgradeProModal.tsx`

**Context:**
Replace `alert('Pembayaran belum terdeteksi...')` and `alert('Gagal mengecek status...')` with an inline alert state `{ type: 'warning' | 'error' | 'success', text: string } | null` styled with amber/red theme colors, so mobile users have a clear visual cue without blocking native modals.

- [ ] **Step 1: Add inline status feedback state to `UpgradeProModal.tsx`**

In `src/components/UpgradeProModal.tsx`:
Add state:
```typescript
const [syncFeedback, setSyncFeedback] = useState<{ type: 'warning' | 'error'; text: string } | null>(null);
```

- [ ] **Step 2: Update the manual check button handler**

Replace lines ~505-515:
```typescript
if (sdata.paid) {
  setStep('success');
} else {
  setSyncFeedback({
    type: 'warning',
    text: 'Pembayaran belum terdeteksi di mutasi QRIS. Pastikan nominal transfer Anda persis sama hingga 3 digit terakhir, lalu coba lagi dalam 15-30 detik.',
  });
}
```
And in `catch`:
```typescript
setSyncFeedback({
  type: 'error',
  text: 'Gagal mengecek status otomatis. Periksa jaringan Anda atau hubungi Admin WhatsApp di bawah.',
});
```

Render `syncFeedback` right above the button:
```tsx
{syncFeedback && (
  <div className={`p-2.5 rounded-xl text-xs text-left flex items-start gap-2 ${
    syncFeedback.type === 'warning'
      ? 'bg-amber-50 border border-amber-200 text-amber-900'
      : 'bg-red-50 border border-red-200 text-red-900'
  }`}>
    <WarningCircle size={16} className="shrink-0 mt-0.5" weight="fill" />
    <span>{syncFeedback.text}</span>
  </div>
)}
```

- [ ] **Step 3: Verify and Build**

Run: `npm run build`
Ensure no compilation errors.

- [ ] **Step 4: Commit**

Commit: `refactor(payment): perbaiki feedback verifikasi manual menjadi inline alert modern`

---

### Task 5: End-to-End Build, Test Suite & Deployment Verification

**Files:**
- None (verification phase)

- [ ] **Step 1: Run complete Vitest suite**
Run: `npx vitest run`
Expected: 270+ passing tests across all test files.

- [ ] **Step 2: Run Next.js production build**
Run: `npm run build`
Expected: 0 errors, all pages rendered statically or dynamically without issues.

- [ ] **Step 3: Git push & Vercel deployment**
Run: `git push origin master`
Poll Vercel deployment until status is `READY`.

- [ ] **Step 4: Browser E2E verification**
Inspect `https://belajar-cpns-saas.vercel.app/manifest.json` returning 200 OK with valid JSON.
Test `/simulasi/hasil/tryout-mini-...` to verify the "Bagikan Hasil ke WhatsApp" button is responsive.
