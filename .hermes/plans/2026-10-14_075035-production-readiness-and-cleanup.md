# Plan: Production Readiness & UI Cleanup (Hapus Redundansi 'Coba Gratis' & Pemantapan Pro)

**Date:** 2026-10-14  
**Target File:** `.hermes/plans/2026-10-14_075035-production-readiness-and-cleanup.md`  
**Status:** DRAFT / READY FOR REVIEW

---

## 1. Goal
Menghapus duplikasi label "Coba Gratis" pada Tryout Mini yang bertabrakan dengan badge "Gratis", memperjelas value proposition dan benefit paket PRO di antarmuka pengguna, serta memvalidasi alur verifikasi transaksi QRIS dan aturan pembatasan akses (gating) agar platform 100% siap untuk rilis produksi.

---

## 2. Current Context & Assumptions
- **Redundansi UI**: `tryout-mini` memiliki `badge: 'Coba Gratis'` di `src/lib/loadPackage.ts` sekaligus terdaftar di `FREE_IDS = new Set(['tryout-mini', 'tryout-1', 'tryout-2'])` di `src/app/simulasi/page.tsx`. Saat dirender, kartu menampilkan dua badge berdampingan: badge `Gratis` (dari `FREE_IDS`) dan badge `Coba Gratis` (dari `pkg.badge`).
- **Paket Pro & Payment**: Sudah ada `UpgradeProModal.tsx` dengan integrasi KlikQRIS (Rp 5.000 single / Rp 150.000 all-access PRO) dan webhook `/api/webhooks/klikqris`. Namun, pengguna belum memiliki akses cepat untuk melihat daftar perbandingan benefit sebelum mengklik paket terkunci.
- **Testing**: Vitest memiliki 256 tests passing. Penyesuaian metadata dan payment guard harus diiringi penambahan unit test untuk mencegah regresi.

---

## 3. Architecture & Proposed Approach
1. **Badge Sanitization**: Hapus badge `'Coba Gratis'` dari `src/lib/loadPackage.ts` dan hilangkan fallback hardcoded di `src/app/api/packages/route.ts`. Pastikan kartu hanya menampilkan satu badge `Gratis` bersih berwarna emerald.
2. **Pricing & Benefit Callout**: Pertegas banner PRO di halaman `/simulasi` dengan ringkasan benefit transparan (jumlah soal, akses figural, garansi bank soal) sehingga nilai investasi Rp 150.000 atau Rp 5.000 terlihat jelas oleh calon pembeli.
3. **Webhook & Access Safety Guard**: Tambahkan unit test untuk memvalidasi alur webhook KlikQRIS (`src/app/api/webhooks/klikqris/route.ts`) dalam menangani status `PAID`, `EXPIRED`, dan payload invalid agar pembukaan akses berbayar terbukti aman dan deterministic.
4. **Verifikasi E2E**: Jalankan browser test untuk memastikan kartu Tryout Mini hanya menampilkan satu badge `Gratis`.

---

## 4. Step-by-Step Tasks

### Task 1: Hapus Badge 'Coba Gratis' pada Tryout Mini di Metadata Paket
- **Objective**: Menghilangkan redundansi visual antara badge `Gratis` dan `Coba Gratis`.
- **Files to Edit**:
  - `src/lib/loadPackage.ts`
  - `src/app/api/packages/route.ts`
  - `src/app/simulasi/page.tsx`
- **TDD / Test Step**:
  1. Buat test assertion di `tests/package-badge.test.ts`:
     ```typescript
     import { describe, it, expect } from 'vitest';
     import { TRYOUT_LIST } from '../src/lib/loadPackage';

     describe('Tryout Package Badges', () => {
       it('ensures tryout-mini does not have redundant Coba Gratis badge', () => {
         const mini = TRYOUT_LIST.find((p) => p.id === 'tryout-mini');
         expect(mini).toBeDefined();
         expect(mini?.badge).toBeNull();
       });
     });
     ```
  2. Jalankan `npx vitest run tests/package-badge.test.ts` (harus FAIL).
  3. Edit `src/lib/loadPackage.ts`:
     Ubah:
     ```typescript
     { id: 'tryout-mini', label: 'Tryout Mini', desc: 'Uji coba cepat 30 soal (10 TWK, 10 TIU, 10 TKP) + soal figural bergambar', badge: 'Coba Gratis', section: 'starter', questionCount: 30, durationMin: 30 },
     ```
     Menjadi:
     ```typescript
     { id: 'tryout-mini', label: 'Tryout Mini', desc: 'Uji coba cepat 30 soal (10 TWK, 10 TIU, 10 TKP) + soal figural bergambar', badge: null, section: 'starter', questionCount: 30, durationMin: 30 },
     ```
  4. Edit `src/app/api/packages/route.ts`:
     Ganti baris 27:
     ```typescript
     badge: meta?.badge ?? null,
     ```
  5. Edit `src/app/simulasi/page.tsx`:
     Pastikan baris render badge tidak menampilkan `pkg.badge` jika `FREE_IDS.has(pkg.id)` untuk mencegah double badge pada paket gratis lainnya di masa depan.
  6. Jalankan `npx vitest run tests/package-badge.test.ts` (harus PASS).
  7. Commit: `fix(simulasi): hapus duplikasi badge coba gratis pada tryout mini`.

---

### Task 2: Pertegas Banner & Komparasi Benefit PRO di `/simulasi`
- **Objective**: Memberikan visibilitas benefit PRO tanpa menunggu user mengklik paket terkunci.
- **Files to Edit**:
  - `src/app/simulasi/page.tsx`
- **Implementasi**:
  1. Perbarui banner non-Pro di bagian atas list tryout:
     - Tampilkan harga promo yang jelas: *"Mulai Rp 5.000 / paket atau Rp 150.000 Akses Penuh Semua Tryout"*.
     - Sebutkan benefit utama dalam 3 poin ringkas:
       - 34 Paket Standar CAT BKN 110 Soal.
       - Paket Khusus Figural Bergambar (120+ gambar).
       - Evaluasi ranking nasional & passing grade otomatis.
  2. Pastikan tombol "Lihat Paket & Upgrade PRO" membuka `UpgradeProModal` dengan trigger yang sesuai.
  3. Verifikasi build: `npm run build`.
  4. Commit: `feat(simulasi): pertegas banner benefit dan harga paket PRO`.

---

### Task 3: Unit Testing Validasi Webhook Pembayaran QRIS
- **Objective**: Menjamin order unlock otomatis saat pembayaran sukses tanpa risiko celah verifikasi.
- **Files to Create/Edit**:
  - `tests/webhook-klikqris.test.ts`
- **Implementasi**:
  1. Tulis skenario pengujian unit untuk logika payload webhook KlikQRIS:
     - Payload tanpa `order_id` mengembalikan 400.
     - Payload dengan `order_id` invalid format mengembalikan 400.
     - Status `PAID` / `SUCCESS` memicu update flag `is_pro` atau append `unlocked_packages`.
     - Status `EXPIRED` menandai order kedaluwarsa.
  2. Jalankan `npx vitest run tests/webhook-klikqris.test.ts`.
  3. Commit: `test(payment): tambahkan unit test untuk skenario webhook klikqris`.

---

### Task 4: Verifikasi Visual & Validasi E2E di Lingkungan Production
- **Objective**: Memastikan tampilan kartu di layar seluler maupun desktop bersih tanpa teks ganda.
- **Command / Verifikasi**:
  1. Build dan deploy ke Vercel via `git push origin master`.
  2. Jalankan headless browser inspection pada `https://belajar-cpns-saas.vercel.app/simulasi`:
     - Periksa DOM pada kartu `Tryout Mini`.
     - Konfirmasi hanya ada satu elemen `.badge-pill` dengan teks `Gratis`.
     - Konfirmasi tidak ada string `"Coba Gratis"` yang muncul di judul maupun badge.
  3. Screenshot bukti hasil verifikasi visual.

---

## 5. Risks & Tradeoffs
| Risiko | Mitigasi |
|---|---|
| User yang belum paham ragu apakah Tryout Mini gratis jika badge 'Coba Gratis' dicopot | Badge `Gratis` (hijau emerald) tetap aktif dan berada di sebelah kanan judul paket, diperkuat oleh deskripsi *"Uji coba cepat 30 soal"*. |
| Database Neon offline saat webhook KlikQRIS masuk | Webhook memiliki retry mechanism dari payment gateway, dan endpoint mengembalikan status 500 sehingga gateway menjadwalkan pengiriman ulang otomatis. |

---

## 6. Definition of Done
- [ ] Kartu Tryout Mini hanya menampilkan satu badge `Gratis` (tidak ada badge ganda `Coba Gratis`).
- [ ] Banner `/simulasi` menyajikan ringkasan harga dan benefit PRO yang transparan.
- [ ] Unit test baru (`package-badge.test.ts` dan `webhook-klikqris.test.ts`) 100% passing.
- [ ] Seluruh suite Vitest passing (258+ tests).
- [ ] Build Next.js sukses tanpa error type/lint.
- [ ] Deployment Vercel berstatus `READY`.
