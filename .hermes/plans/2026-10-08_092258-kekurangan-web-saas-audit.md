# Audit & Implementation Plan: Fitur & Celah Kritis Lolos.in SaaS

## Goal
Mengidentifikasi seluruh kekurangan teknis, fungsional, dan bisnis pada Lolos.in, lalu menyusun roadmap perbaikan terstruktur agar platform siap skala dan bersaing secara profesional.

---

## Current Context / Assumptions
- **Platform**: Web SaaS simulasi CPNS Next.js 14 App Router, PostgreSQL (Neon/Supabase), Tailwind CSS, Claude Amber theme.
- **Fitur Utama yang Sudah Berjalan**:
  - Simulasi CAT 36 paket (3.786 butir soal), dual mode (official & practice), timer 100 menit.
  - Drill / Latihan Kilat per kategori & sub-kategori, drill ulang salah.
  - Modul Psikotes: Kraepelin & Penalaran Analitis.
  - Roadmap streak harian dengan kalender.
  - Pembayaran QRIS live via KlikQRIS production dengan nominal unik dan auto-verification.
  - Guard PRO user agar tidak bisa re-purchase paket terbuka.
  - Storage isolasi per akun (`scopedKey`) dan guest session temporary.

---

## Analisis Celah & Kekurangan (Gap Analysis)

### 1. Kepatuhan Brand & Konsistensi UI (Tinggi)
- **Problem**: Navbar masih menggunakan emoji (`⚡ Latihan Kilat`, `🃏 Flashcard`, `🗺️ Roadmap`), bertentangan dengan preferensi brand: *Dilarang emoji pada elemen antarmuka simulasi/filter; gunakan @phosphor-icons/react saja*.
- **Impact**: Mengurangi kesan profesional aplikasi ujian resmi standar CAT BKN.

### 2. SEO & Akses Organik (Kritis untuk Pertumbuhan Bisnis)
- **Problem**:
  - Tidak memiliki `src/app/sitemap.ts` (Next.js dynamic sitemap) untuk 36 paket tryout dan kategori drill.
  - Tidak memiliki `src/app/robots.ts`.
  - Tidak ada metadata Open Graph (`og:image`, `og:title`) per halaman tryout / hasil tryout.
- **Impact**: Google/Bing tidak mengindeks paket-paket tryout; share link tryout ke WhatsApp atau medsos tidak memunculkan preview card yang menarik.

### 3. Alur Autentikasi: Tidak Ada "Lupa Kata Sandi" (Kritis)
- **Problem**: Form login (`/login`) hanya mendukung login password dan register OTP. Jika pengguna lupa kata sandi, tidak ada mekanisme kirim link/OTP reset password.
- **Impact**: Akun pengguna premium (PRO) bisa terkunci permanen jika lupa password, memicu komplain ke CS WhatsApp.

### 4. User Experience Tryout: Export Hasil / Pembahasan ke PDF (Diferensiasi)
- **Problem**: Halaman hasil (`/simulasi/hasil/[resultId]`) hanya menampilkan review di web. Peserta tidak bisa mencetak kartu hasil nilai atau menyimpan pembahasan 110 soal sebagai arsip offline PDF.
- **Impact**: Peserta terpaksa screenshot satu per satu atau bolak-balik buka web.

### 5. Gamifikasi & Tracking: Target Formasi vs Passing Grade di Profil
- **Problem**: Halaman profil menyimpan `targetInstansi` dan `targetFormasi`, tetapi belum menampilkan passing grade resmi (TWK: 65, TIU: 80, TKP: 166, Total: 311) serta gap analisis terhadap skor riwayat terakhir pengguna.
- **Impact**: Pengguna kurang terikat (low engagement) untuk terus mengulang tryout.

---

## Roadmap Pelaksanaan Terarah (Prioritas)

| Fase | Inisiatif | Estimasi Bobot |
|---|---|---|
| **Fase 1** | Pembersihan Brand: Hapus emoji dari Navbar, ganti icon Phosphor murni | 5 Menit |
| **Fase 2** | SEO Engine: Buat `robots.ts`, `sitemap.ts`, dan Open Graph metadata dinamis | 15 Menit |
| **Fase 3** | Auth Reliability: Fitur Reset Password via OTP Email (`/api/auth/forgot-password` & `/api/auth/reset-password`) | 25 Menit |
| **Fase 4** | Value Add: Tombol "Cetak / Simpan PDF Hasil Ujian" di halaman hasil tryout | 20 Menit |
| **Fase 5** | Profil Upgrade: Tracker Passing Grade & Rekomendasi Sub-Materi Lemah | 20 Menit |

---

## Step-by-Step Tasks

### Task 1: Bersihkan Emoji Navbar & Sesuaikan Icon Phosphor
**File:** `src/components/Navbar.tsx`
- Hapus emoji dari array `NAV_LINKS`:
  - `'⚡ Latihan Kilat'` → `'Latihan Kilat'`
  - `'🃏 Flashcard'` → `'Flashcard'`
  - `'🗺️ Roadmap'` → `'Roadmap'`

### Task 2: Buat Next.js SEO `robots.ts` dan `sitemap.ts`
**Files:**
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- Generate URL untuk:
  - `/`
  - `/simulasi`
  - 36 paket tryout (`/simulasi/tryout-1` s/d `tryout-34`, `tryout-mini`, `tryout-figural`)
  - `/psikotes` (`/psikotes/kraepelin`, `/psikotes/penalaran`)
  - `/drill`

### Task 3: Implementasi Flow Reset / Lupa Password
**Files:**
- `src/app/api/auth/forgot-password/route.ts`: Endpoint kirim OTP reset password via `sendOtpEmail` (atau template reset).
- `src/app/api/auth/reset-password/route.ts`: Endpoint verifikasi OTP + hash password baru.
- `src/app/login/page.tsx`: Tambah toggle / modal "Lupa Password" dengan step masukan email → masukan OTP & password baru.

### Task 4: Export Kartu Hasil Ujian (Print / PDF View)
**File:** `src/app/simulasi/hasil/[resultId]/page.tsx`
- Tambahkan tombol "Cetak Kartu Hasil" yang mentrigger browser print styling (`@media print`) yang bersih tanpa navbar/footer, atau generate tampilan ringkasan siap unduh.

---

## Tests / Validation
1. `npm run build` harus exit 0 tanpa TypeScript error.
2. Cek `/robots.txt` dan `/sitemap.xml` di browser/curl — harus me-render XML valid berisi URL semua paket.
3. Navbar di mobile dan desktop bersih tanpa emoji.
4. Uji alur reset password dari `/login` — OTP masuk ke database/email dan password berhasil diubah.

---

## Risiko & Tradeoff
- **Kirim Email OTP**: Butuh konfigurasi SMTP (`SMTP_HOST`, `SMTP_USER`, dll.) yang aktif jika ingin email live. Jika SMTP belum diisi di environment, sistem harus tetap aman atau fallback graceful dengan dev logs.
- **Print Styles**: Styling cetak PDF harus menyembunyikan navigasi, tombol floating support, dan tombol aksi agar hemat kertas dan profesional.
