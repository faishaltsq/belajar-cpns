# Implementation Plan: Web Polish, PWA Mobile Readiness, and Auth Mailer Resilience

## Goal
Melengkapi infrastruktur PWA untuk instalasi mobile native, memperkuat ketahanan pengiriman email OTP (fallback graceful & dev mode bypass), serta menyempurnakan format cetak sertifikat hasil tryout agar Lolos.in siap digunakan di lingkungan produksi secara stabil.

---

## Current Context / Assumptions
- **Platform**: Next.js 15 App Router, PostgreSQL (Neon Serverless), Tailwind CSS, Claude Amber Theme (`#faf9f5`, `#c96442`).
- **Pembaruan Terkini**:
  - Seluruh 37 paket (Tryout 1–34, Figural I & II, Mini) telah memiliki data lengkap di DB dan file fallback statis JSON (`src/data/packages/`).
  - Tabel `password_resets` telah dibuat di database Neon.
  - Subkategori latihan kilat (`/drill`) telah diperbaiki dengan fuzzy alias matching.
- **Kekurangan yang Masih Ada**:
  1. Belum ada Web App Manifest (`manifest.ts`) dan meta viewport `theme-color` sehingga aplikasi belum memenuhi syarat instalasi PWA di Chrome/Safari ponsel.
  2. Alur registrasi dan reset password masih menggantung (blank OTP step) jika kredensial SMTP/Resend belum disetel di environment, tanpa pesan kegagalan yang jelas ke user.
  3. Tombol cetak kartu hasil ujian di `/simulasi/hasil/[resultId]` belum memiliki styling `@media print` yang mengisolasi sertifikat dan menyembunyikan navigasi/tombol aksi.

---

## Architecture / Proposed Approach
1. **PWA & Viewport Standards**:
   - Implementasikan file rute bawaan Next.js `src/app/manifest.ts` dengan konfigurasi standalone mode, background `#faf9f5`, theme color `#c96442`, dan ikon vector SVG `icon.svg`.
   - Tambahkan export `viewport: Viewport` di `src/app/layout.tsx` untuk mengatur status bar mobile (`themeColor`) dan viewport mobile.
2. **Auth & Mailer Fallback Protection**:
   - Perbarui `src/app/api/auth/register/route.ts` dan `src/app/api/auth/forgot-password/route.ts`: jika `sendOtpEmail` gagal karena ketiadaan konfigurasi SMTP/Resend:
     - Pada `NODE_ENV !== 'production'` (lokal/testing): sertakan `devOtp` pada payload respons agar alur verifikasi tetap dapat diuji.
     - Pada mode produksi: kembalikan error status 503 dengan panduan hubungi admin, sehingga frontend tidak membiarkan user terjebak di langkah OTP kosong.
   - Perbarui `src/app/login/page.tsx` untuk menangani status kegagalan pengiriman email dan menampilkan autofill OTP otomatis jika `devOtp` tersedia.
3. **Printable Exam Certificate & Clean Report**:
   - Tambahkan styling `@media print` pada `src/app/globals.css` yang menyembunyikan elemen non-cetak (`nav`, `footer`, tombol navigasi, filter) dan menyajikan kartu skor CAT BKN dalam format portrait bersih siap cetak/simpan PDF.

---

## Step-by-Step Tasks

### Task 1: Buat Web App Manifest untuk PWA
**File:** `src/app/manifest.ts`
- Buat file route manifest bawaan Next.js.
- Kode:
```typescript
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lolos.in - Platform Belajar & Simulasi CPNS',
    short_name: 'Lolos.in',
    description: 'Platform simulasi CAT SKD CPNS standar BKN dengan 37 paket tryout, drill kilat, dan modul psikotes.',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf9f5',
    theme_color: '#c96442',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
```
- **Verifikasi**: Jalankan `curl -I http://localhost:3000/manifest.webmanifest` atau jalankan `npm run build` untuk memastikan route `manifest.webmanifest` ter-generate otomatis.

---

### Task 2: Pasang Meta Viewport & Theme Color di Layout Utama
**File:** `src/app/layout.tsx`
- Tambahkan export `viewport` bertipe `Viewport` dari `'next'`:
```typescript
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#c96442',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};
```
- Pastikan warna bar browser mobile konsisten dengan palet Claude Amber.

---

### Task 3: Perkuat Ketahanan Pengiriman OTP di Endpoint Registrasi
**File:** `src/app/api/auth/register/route.ts`
- Evaluasi hasil `sendOtpEmail(email, otp)`.
- Jika gagal:
  - Cek `process.env.NODE_ENV !== 'production'` atau ketiadaan konfigurasi SMTP.
  - Jika testing: return `{ ok: true, devOtp: otp, message: 'OTP pengujian otomatis diterapkan.' }`.
  - Jika production dan email gagal: hapus record OTP dari database dan kembalikan `{ ok: false, error: 'Gagal mengirimkan email verifikasi. Pastikan alamat email aktif atau hubungi layanan bantuan.' }` dengan status 503.

---

### Task 4: Perkuat Ketahanan Pengiriman OTP di Endpoint Lupa Password
**File:** `src/app/api/auth/forgot-password/route.ts`
- Terapkan logika penanganan gagal kirim yang serupa dengan Task 3.
- Jika email gagal terkirim di environment tanpa SMTP, jangan berikan respons berhasil palsu. Sertakan `devOtp` di non-production untuk kemudahan pengujian.

---

### Task 5: Perbarui Antarmuka Login/Register untuk Menerima Dev OTP
**File:** `src/app/login/page.tsx`
- Jika respons dari `/api/auth/register` atau `/api/auth/forgot-password` mengembalikan `devOtp`:
  - Otomatis isi state input OTP (`setOtp(data.devOtp)`).
  - Tampilkan banner informasi mode pengujian: *"Mode Pengujian: Kode OTP otomatis terisi ({data.devOtp})"*.
- Jika API mengembalikan error 503 (email gagal):
  - Tampilkan pesan error secara gamblang di form tanpa memindahkan langkah ke input OTP yang tidak mungkin selesai.

---

### Task 6: Terapkan CSS `@media print` untuk Kartu Hasil Ujian
**File:** `src/app/globals.css`
- Tambahkan aturan cetak:
```css
@media print {
  /* Sembunyikan elemen antarmuka yang tidak relevan saat cetak */
  nav,
  footer,
  aside,
  button,
  .no-print {
    display: none !important;
  }

  body {
    background: #ffffff !important;
    color: #1a1a1a !important;
  }

  main {
    padding: 0 !important;
    margin: 0 !important;
    max-width: 100% !important;
  }

  /* Pastikan kartu hasil tidak terpotong canggung di halaman cetak */
  .print-card {
    border: 1px solid #e5e5e5 !important;
    box-shadow: none !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
```

---

### Task 7: Verifikasi dan Build Kompilasi
- Jalankan pemeriksaan tipe dan build Next.js:
  ```bash
  npm run build
  ```
- Output yang diharapkan: Seluruh rute (termasuk `/manifest.webmanifest`) terkompilasi tanpa error dengan status exit 0.

---

## Tests / Validation
1. **Manifest Validation**:
   - Periksa bahwa rute `/manifest.webmanifest` mengembalikan JSON dengan `start_url: '/'` dan tema warna `#c96442`.
2. **Registration & Forgot Password Fallback Test**:
   - Uji panggilan POST ke `/api/auth/register` dalam mode development: respons harus menyertakan `devOtp`.
   - Uji alur reset password: input OTP terisi otomatis pada lingkungan pengujian tanpa menunggu email eksternal.
3. **Print Test**:
   - Buka `/simulasi/hasil/[resultId]` dan simulasikan print stylesheet untuk memastikan navbar, footer, dan tab filter tersembunyi dengan rapi.
4. **Git Hygiene**:
   - Seluruh perubahan dicatat dengan pesan commit yang jelas dan deskriptif.

---

## Risks, Tradeoffs, and Open Questions
- **Keamanan Dev OTP**:
  - Properti `devOtp` wajib diproteksi secara ketat dengan guard `process.env.NODE_ENV !== 'production'`, tidak boleh bocor pada deployment produksi live.
- **Penyimpanan Ikon PWA**:
  - Penggunaan `src/app/icon.svg` sebagai ikon manifest didukung oleh seluruh browser modern (Chrome Android, iOS Safari 16.4+). Ikon raster tambahan dapat ditambahkan nanti jika dibutuhkan oleh sistem operasi lama.
