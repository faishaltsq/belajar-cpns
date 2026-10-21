# PROJECT_DISCOVERY.md — Peta Proyek belajar-cpns-saas

Semua klaim di dokumen ini berstatus **TERVERIFIKASI** kecuali ditandai **HIPOTESIS**.
Sumber dicantumkan per baris/section. Tanggal pengumpulan: 2026-10-20 (sesi audit ini).
Repo: `C:\Users\cubeb\OneDrive\Documents\coding\projects\belajar-cpns-saas` (remote `https://github.com/faishaltsq/belajar-cpns.git`, sumber: `git remote -v`).

---

## 1. Ringkasan stack

| Aspek | Fakta | Sumber |
|---|---|---|
| Framework | Next.js 14 App Router + React 18 + TypeScript 5.6 + Tailwind 3.4 | `package.json` |
| Runtime DB | **Neon Postgres** via `@neondatabase/serverless` (`neon()`), `neonConfig.fetchConnectionCache = true` | `src/lib/db.ts:1-9` |
| Koneksi | `process.env.DATABASE_URL \|\| process.env.POSTGRES_URL`, `getDb()` mengembalikan `null` bila keduanya kosong | `src/lib/db.ts:6-8` |
| Auth | JWT HS256 di cookie `cpns_token` (`jose`), password hash `bcryptjs` | `src/lib/auth.ts`, `src/lib/session.ts` |
| Pembayaran | KlikQRIS QRIS, server-authoritative pricing | `src/lib/klikqris.ts`, `src/lib/pricing.ts` |
| Email | Resend-first, fallback nodemailer SMTP | `src/lib/mailer.ts` |
| Error tracking | Sentry (`withSentryConfig`), tunnel `/monitoring` | `next.config.js:1,64`, `sentry.client.config.ts` |
| Analytics | `@vercel/analytics` + `@vercel/speed-insights` di root layout | `src/app/layout.tsx:8-9` |
| Test | vitest | `package.json` `"test": "vitest run"`, `vitest.config.ts` |
| Host | Vercel (project `belajar-cpns-saas`, `prj_5Aow4aRugEHKXcgLDYA6w9zTZUoq`) | `.vercel/project.json` |

---

## 2. Layout repo

```
src/app/          21 page.tsx + 37 route.ts (API)
src/components/   24 komponen (Navbar, ExamSession-adjacent, modals, admin/)
src/lib/          36 modul (auth, db, pricing, entitlement, scoring, dll)
src/data/         packages/*.json (37 file), flashcards.ts, journeySchedule.ts,
                  drillContent.ts, psikotes_*.json, figural_bank*.json
supabase/         schema.sql + RLS policies  ← lihat §6 (discrepancy)
migrations/       001…011 SQL, diterapkan MANUAL
scripts/          24 file: apply-migration.mjs + pipeline ekstraksi/scraper/crop
tests/            52 file *.test.ts
docs/             audit sebelumnya + docs/audit/ (lighthouse, build log)
```

Sumber: `find src/app -name "page.tsx"`, `find src/app/api -name "route.ts"`, `ls` per direktori (jalankan sesi ini).

Artefak non-source yang **ter-track git** (710 file total tracked): `dogfood-output/report.md` + 4 PNG screenshot, `extract.log` (9.4 KB), `t1.html` (16.9 KB), `scripts/migrations/004_create_issue_reports.sql`.
Sumber: `git ls-files | grep -E "extracted/|dogfood-output/|__pycache__|\.pyc$|t1.html|extract.log|scripts/migrations"`.

Artefak **untracked** di root (belum di-commit, ada di working tree): `_db_audit_tmp.mjs`, `_db_breakdown_tmp.mjs`, `_db_questions_tmp.mjs`, `_db_questions_tmp2.mjs`, `_db_snapshot_tmp.mjs`, `_db_snapshot2_tmp.mjs` — skrip sementara sesi audit DB sebelumnya.
Sumber: `git status --porcelain`.

Working tree **kotor** saat audit (modified): `src/app/api/drill/check/route.ts`, `src/app/api/payment/create-order/route.ts`, `src/app/api/questions/[id]/route.ts`, `src/app/api/results/route.ts`, `src/app/simulasi/[id]/ExamSession.tsx`, `src/components/FinishExamModal.tsx`, `src/components/UpgradeProModal.tsx`, `src/lib/klikqris.ts`, `src/lib/pricing.ts` + 4 file test. **Untracked**: `src/lib/entitlement.ts`, `src/lib/examClock.ts`, `tests/entitlement-gate.test.ts`, `tests/exam-clock.test.ts`, `docs/audit/`.
Sumber: `git status --porcelain`.
→ Artinya lapisan entitlement yang jadi dasar pembatasan akses **belum masuk commit**; build CI di GitHub Actions (yang hanya checkout `master`) **tidak melihatnya**.

---

## 3. Frontend / backend split

- **Server (route handlers)**: semua `src/app/api/**/route.ts` (37 endpoint), menjalankan SQL lewat `getDb()`.
- **Server (React Server Component)**: sebagian besar `page.tsx` adalah client components (`'use client'`) — katalog, drill, psikotes, riwayat di-render di browser dan memanggil API.
- **Client data**: progres belajar (roadmap, flashcard, drill, riwayat latihan) disimpan di `localStorage` ber-scoping per user, bukan di DB — lihat §7.
- **Content source**: soal tryout diambil dari `src/data/packages/*.json` melalui `loadPackage(id)` (`src/lib/loadPackage.ts:102`) yang membaca DB lebih dulu lalu fallback ke JSON.

---

## 4. Database & cara diakesi

- Titik tunggal: `getDb()` → `neon(url)` (`src/lib/db.ts:5-9`). Semua pemanggilan memakai tagged template `` sql`SELECT ...` ``.
- `isDbConnected()` = `SELECT 1` (`src/lib/db.ts:11-20`).
- **Fail-open/fail-closed perilaku**: banyak fungsi `return null / []` saat `getDb()` null (mis. `saveExamResult` → `null`, `getUserResults` → `[]`, `getEntitlements` → non-Pro). Entitlement **fail-closed** (hanya paket gratis yang lolos) — `src/lib/entitlement.ts:55,67,82`.
- Schema + RLS: `supabase/schema.sql` (lihat §6).
- Migrasi SQL di `migrations/`: `001_initial_schema.sql`, `002_package_settings.sql`, `003_ebook_contexts.sql`, `004_question_bank.sql`, `007_add_signature_to_payment_orders.sql`, `008_add_qris_columns_to_payment_orders.sql`, `009_drop_exact_amount_unique_index.sql`, `010_rate_limits.sql`, `011_add_bundle_package_ids.sql`.
  **Nomor 005 dan 006 tidak ada di direktori.**
- Penerapan: `node scripts/apply-migration.mjs migrations/<file>.sql` — **manual**, tidak ada step migrasi di `.github/workflows/ci.yml` (isinya hanya `npm ci` → `npx vitest run` → `npx tsc --noEmit` → `npx next build`) dan tidak ada `vercel.json` (`ls vercel.json` → "no vercel.json").
  → **HIPOTESIS**: lingkungan produksi dapat tertinggal skema lokal bila migrasi baru lupa diterapkan; tidak ada bukti eksekusi migrasi ke Neon di sesi ini.

---

## 5. Autentikasi

- Register/login/logout/me: `src/app/api/auth/{register,login,logout,me}/route.ts`.
- Lupa & reset password: `src/app/api/auth/{forgot-password,reset-password,verify-link,verify-otp}/route.ts`.
- Token: `signToken`/`verifyToken` di `src/lib/auth.ts`, cookie `cpns_token`, dibaca via `cookies().get('cpns_token')` (`src/lib/entitlement.ts:43`).
- Rate limit login/register/reset: `checkRateLimit(...)` + `getClientIp(req)` (`src/lib/rateLimit.ts`), storage persisten tabel `rate_limits` (`migrations/010_rate_limits.sql`).
- Admin **bukan** sesi JWT: header `x-admin-pin` dibandingkan timing-safe dengan `ADMIN_PIN` (`src/lib/adminAuth.ts:11-30`). PIN default `123456` ditolak di production; `ADMIN_PIN` kosong → seluruh route admin mati.
  - Bukti: `.env.local` lokal hanya berisi `DATABASE_URL POSTGRES_URL JWT_SECRET SENTRY_DSN NEXT_PUBLIC_SENTRY_DSN` (key names saja dari `grep -oE "^[A-Z_]+=" .env.local`) → **`ADMIN_PIN` tidak ada di file env yang ter-commit**.

---

## 6. DISCREPANCY: Neon vs folder `supabase/`

**TERVERIFIKASI:**
- Runtime = Neon. `src/lib/db.ts:1` `import { neon } from '@neondatabase/serverless'`; tidak ada satu pun route yang memanggil Supabase.
- `src/lib/supabase.ts` membuat `supabaseAdmin` dari `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, berisi `findUserByPhone`/`createUser` bergaya **PIN/phone** — model user yang berbeda dari `users.email`/`password_hash` yang dipakai aplikasi.
- Pencarian seluruh `src/` dan `tests/` untuk `supabase` **tidak menemukan satu pun import `@/lib/supabase`** di luar file itu sendiri (`grep -rn "supabase" src tests` → hanya 6 baris, semuanya di dalam `src/lib/supabase.ts`).
- `@supabase/supabase-js@^2.45.4` tetap terpasang di `package.json` dependencies.
- `supabase/schema.sql` tetap jadi acuan skema + RLS, padahal RLS ditegakkan oleh Postgres *authorization*, sementara koneksi aplikasi memakai kredensial Neon (kemungkinan owner/superuser) — lihat HIPOTESIS H-1.

**HIPOTESIS (belum dieksekusi):**
- **H-1**: `supabase/schema.sql` dan RLS-nya **tidak aktif** dalam praktik karena aplikasi tidak terhubung ke Supabase dan tidak ada bukti policy diterapkan ke database Neon. Belum dijalankan `SELECT * FROM pg_policies`.
- **H-2**: `src/lib/supabase.ts` adalah kode mati (dead code) dan kandidat penghapusan; buktinya hanya ketiadaan importer, belum diverifikasi lewat build tanpa file tersebut.

---

## 7. Payment flow end-to-end (create-order → KlikQRIS → webhook → entitlement)

1. **create-order** `POST /api/payment/create-order` (`src/app/api/payment/create-order/route.ts`)
   - Wajib cookie `cpns_token` valid → 401 (baris 16-23).
   - `orderType` divalidasi dengan `isOrderType()` — nilai asing ditolak 400 `INVALID_ORDERTYPE` (baris 29-35).
   - Bundle divalidasi bentuknya sebelum sentuh DB via `validateBundlePackageIds()` (`src/lib/pricing.ts:59-89`): tepat `BUNDLE_SIZE = 5`, tanpa duplikat, tanpa paket gratis, tanpa paket yang sudah dimiliki.
   - **Harga dari server saja**: `const baseAmount = priceFor(orderType);` — `body.baseAmount` tidak pernah dibaca (baris 62-64). `PRICE_TABLE = { single: 5000, bundle: 18000, pro: 59000 }` (env-overridable, floor `MIN_GATEWAY_AMOUNT = 1000`) — `src/lib/pricing.ts:9-33`.
   - Guard ganda: user sudah `is_pro` → 409 `ALREADY_PRO`; paket sudah di `unlocked_packages` → 409 `ALREADY_UNLOCKED` (baris 71-111).
   - `effectivePackageId = orderType === 'bundle' ? 'bundle' : packageId` (baris 60) supaya dedupe order pending tidak kena `NULL`.
   - Ada reuse order pending yang belum lewat `expires_at` (query baris 116-120+).
2. **Gateway**: `createKlikQrisTransaction()` (`src/lib/klikqris.ts`) → menghasilkan `qris_url`, `qris_image`, `unique_code`, `exact_amount`, `signature`.
3. **User scan QR** → status di-poll lewat `GET /api/payment/order-status`, `POST /api/payment/sync`, riwayat via `GET /api/payment/history`, batal via `POST /api/payment/cancel` (semua ber-guard JWT — lihat tabel §8).
4. **Webhook** `POST /api/webhooks/klikqris` (`src/app/api/webhooks/klikqris/route.ts`)
   - Parsing dua format (flat & `data.*`) baris 26-29; `order_id` dinormalisasi `INV-123` → angka (`match(/\d+/)`) baris 36.
   - **Signature wajib**: `order.signature` NULL atau signature masuk kosong → 403; perbandingan `crypto.timingSafeEqual` dengan cek panjang lebih dulu (baris 66-80).
   - **Anti-underpayment**: `paidAmount > 0 && paidAmount < exact_amount` → 400 (baris 84-87).
   - **Idempoten**: bila `order.status === 'paid'` → 200 tanpa aksi (baris 90-92).
   - **Transisi atomik**: `UPDATE ... WHERE id = $1 AND status='pending' RETURNING id` — hanya satu permintaan yang boleh grant (baris 99-110).
   - `status === 'EXPIRED'` → set `expired` (baris 122-129).
5. **Grant** `grantEntitlement(sql, order)` (`src/lib/grantEntitlement.ts`)
   - Resolusi user: `order.user_id` dulu, fallback `user_email` di-lookup ke `users`.
   - `order_type='pro'` → `is_pro = true, pro_activated_at = NOW()`.
   - `single` → tambah `package_id`; `bundle` → merge seluruh `package_ids` ke `unlocked_packages` (dedupe, JSONB).
   - `order_type` tak dikenal → **tidak di-grant**, hanya `console.warn` (baris 87).
   - Dipakai bersama oleh **webhook** dan **manual sync** (`src/lib/payment/sync`) supaya tidak divergen.
6. **Enforcement baca paket** `checkPackageAccess()` (`src/lib/entitlement.ts:77-93`) di: `/api/questions/[id]`, `/api/results`, `/api/drill/check` (dikonfirmasi per masing-masing file route).
   - `packageCacheControl()`: gratis → `public, s-maxage=300`; berbayar → `private, no-store` (`src/lib/entitlement.ts:103-107`).
7. **Abandoned-payment reminder**: `POST /api/payment/abandoned-reminders` memilih order `pending` berusia 1–24 jam dengan `last_reminded_at IS NULL` (`route.ts:25-35`), eligibility di `src/lib/abandonedReminder.ts:1-15`, email dibangun `buildAbandonedReminderEmail()`.

---

## 8. Daftar lengkap route handler API (37 file)

Guard dibaca dari isi file (`grep` atas nama fungsi): `admin` = `isAuthorizedAdmin`, `jwt` = `verifyToken`/`cpns_token`, `entitlement` = `checkPackageAccess`, `ratelimit` = `checkRateLimit`, `session` = `getSessionUserId`, `signature` = verifikasi signature.

| Route | Method | Guard |
|---|---|---|
| `src/app/api/admin/db-status/route.ts` | GET | admin |
| `src/app/api/admin/figural-images/route.ts` | GET | admin |
| `src/app/api/admin/figural-img/route.ts` | GET | admin |
| `src/app/api/admin/generate-custom/route.ts` | POST | admin |
| `src/app/api/admin/generate-ebook/route.ts` | GET, POST | admin |
| `src/app/api/admin/migrate/route.ts` | POST | admin |
| `src/app/api/admin/normalize-images/route.ts` | POST | admin |
| `src/app/api/admin/packages/route.ts` | GET, POST, PUT, PATCH, DELETE | admin |
| `src/app/api/admin/question-bank/route.ts` | GET, POST | admin |
| `src/app/api/admin/save-cropped-image/route.ts` | POST | admin |
| `src/app/api/admin/upload/route.ts` | POST | admin |
| `src/app/api/auth/forgot-password/route.ts` | POST | ratelimit |
| `src/app/api/auth/login/route.ts` | POST | jwt, ratelimit |
| `src/app/api/auth/logout/route.ts` | POST | jwt |
| `src/app/api/auth/me/route.ts` | GET | jwt |
| `src/app/api/auth/register/route.ts` | POST | ratelimit, signature |
| `src/app/api/auth/reset-password/route.ts` | POST | ratelimit |
| `src/app/api/auth/verify-link/route.ts` | GET | jwt, ratelimit |
| `src/app/api/auth/verify-otp/route.ts` | POST | jwt, ratelimit |
| `src/app/api/drill/check/route.ts` | POST | entitlement, ratelimit |
| `src/app/api/leaderboard/[packageId]/route.ts` | GET | — (publik) |
| `src/app/api/packages/route.ts` | GET | — (publik) |
| `src/app/api/payment/abandoned-reminders/route.ts` | POST | CRON_SECRET *(fail-open, lihat T-3)* |
| `src/app/api/payment/cancel/route.ts` | POST | jwt |
| `src/app/api/payment/create-order/route.ts` | POST | jwt, signature |
| `src/app/api/payment/history/route.ts` | GET | jwt |
| `src/app/api/payment/order-status/route.ts` | GET | jwt |
| `src/app/api/payment/sync/route.ts` | POST | jwt |
| `src/app/api/pro/recap/route.ts` | GET | jwt |
| `src/app/api/questions/[id]/route.ts` | GET | entitlement |
| `src/app/api/results/route.ts` | POST | entitlement, ratelimit, session |
| `src/app/api/results/[id]/review/route.ts` | GET | jwt |
| `src/app/api/support/report/route.ts` | POST | ratelimit |
| `src/app/api/user/change-password/route.ts` | POST | jwt |
| `src/app/api/user/profile/route.ts` | GET, PUT | jwt |
| `src/app/api/user/status/route.ts` | GET | jwt |
| `src/app/api/webhooks/klikqris/route.ts` | POST | signature |

Sumber: inspeksi otomatis seluruh `src/app/api/**/route.ts` (`export async function <METHOD>` + nama guard).

---

## 9. State management

- **Tidak ada Redux/Zustand/Jotai/RSC-remote-state library** di `package.json` (hanya `clsx`, `tailwind-merge` untuk util).
- Server state = fetch API biasa di client components (`useState`/`useEffect`).
- Persistensi lokal terpusat di `src/lib/userStorage.ts`:
  - `scopedKey(featureKey, userId)` → `` `lolos_${userId ? 'u_'+userId : 'guest'}_${featureKey}` `` (baris 14-17) → progres terisolasi per akun.
  - Helper: `getScopedJSON`, `setScopedJSON`, `removeScopedKey`, `clearGuestTrialFlags`, `clearAllGuestData`.
  - `GUEST_TRIAL_KEYS = ['lolos_guest_tried_drill','lolos_guest_tried_flashcard','lolos_guest_tried_journey','lolos_guest_tried_psikotes']` (baris 7-12).
- Flag trial guest di-set di: `DrillSession.tsx:238`, `flashcard/page.tsx:109,129`, `journey/page.tsx:113,138`, `psikotes/hasil/page.tsx:97`; di-reset saat login pada baris 91/63/62/92 masing-masing file.
- `GuestLimitModal` dipakai di 5 halaman: `drill/[category]/[subCategory]/DrillSession.tsx`, `flashcard/page.tsx`, `journey/page.tsx`, `psikotes/hasil/page.tsx`, `riwayat/page.tsx`.

---

## 10. Test / lint / CI

- **Jalankan di sesi ini** (`npx vitest run --reporter=basic`):
  ```
  Test Files  52 passed (52)
  Tests  598 passed (598)
  Duration 5.02s
  ```
  → angka lama "51 test files / 588 tests" di laporan sebelumnya sudah **usang** (terverifikasi perintah di atas).
- CI (`.github/workflows/ci.yml`): trigger `push`/`pull_request` ke `master`; step = `npm ci` → `npx vitest run` (env `NODE_ENV=test`) → `npx tsc --noEmit` → `npx next build`.
- Lint: `next lint` (script `lint` di `package.json`), **tidak termasuk step CI** (terverifikasi: workflow hanya 4 step di atas).
- Suppressions:
  - `eslint-disable` : **13 occurrences** di **7 file** — `src/app/admin-kelola/page.tsx`, `src/components/admin/FiguralCropEditor.tsx`, `src/components/ExamQuestionReview.tsx`, `src/components/QuestionCard.tsx`, `src/components/QuestionNavigationGrid.tsx`, `src/components/ReportIssueModal.tsx`, `src/components/UpgradeProModal.tsx`.
  - `@ts-ignore` / `@ts-expect-error`: **0** (`grep -rn` → kosong).
  - Deklarasi `: any` : **3** — `src/app/api/pro/recap/route.ts`, `src/app/api/payment/history/route.ts`, `src/app/api/admin/packages/route.ts` (ditambah `Record<string, any>[]` lokal di `create-order/route.ts:115`).

---

## 11. Hosting, SEO, observability

- Vercel project `belajar-cpns-saas` (`.vercel/project.json`), tanpa `vercel.json` → konfigurasi header/cron di `next.config.js` + dashboard.
- Security headers di `next.config.js`: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`, `Strict-Transport-Security`, plus rule `Cache-Control` (8 `key:` terdeteksi).
- Sentry: `withSentryConfig(nextConfig, …)` (`next.config.js:64`), `sentry.client.config.ts`, DSN di `.env.local` (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`).
- Lighthouse (dikutip dari `docs/audit/lighthouse-*.json`, skor dihitung `categories.*.score*100`):

  | Artefak | Perf | A11y | BP | SEO |
  |---|---|---|---|---|
  | `lighthouse-desktop.json` | 100 | 90 | 96 | 100 |
  | `lighthouse-mobile.json` | 76 | 90 | 96 | 100 |
  | `lighthouse-mobile-simulasi.json` | 97 | 90 | 96 | 100 |

- Produksi/URL publik: `https://lolosin.com` (dipakai sebagai default di `src/lib/abandonedReminder.ts:21`) dan `https://belajar-cpns-saas.vercel.app` (`docs/security-verification.md:5`).
