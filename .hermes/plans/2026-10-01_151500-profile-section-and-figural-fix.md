# Rencana Implementasi: Section Profil Pengguna & Perbaikan Soal Bergambar

## Goal
Menyediakan halaman/section profil yang dapat diakses saat pengguna mengklik profil di Navbar untuk mengubah nama dan foto profil (avatar), memastikan nama profil ter-display di Leaderboard Nasional, serta memperbaiki seluruh referensi dan aksesibilitas soal figural bergambar di platform Lolos.in.

---

## Konteks & Asumsi
1. **Tech Stack**: Next.js 14 App Router, TypeScript, Tailwind CSS, Neon PostgreSQL, Vitest.
2. **Auth Saat Ini**: Cookie `cpns_token` (JWT httpOnly 7 hari) yang diverifikasi via `/api/auth/me`. `useUser` hook mendengarkan state session.
3. **Database**: Tabel `users` di Neon PostgreSQL saat ini memiliki kolom `id`, `email`, `password_hash`, `name`, `phone`, `created_at`. Belum ada kolom `avatar_url`.
4. **Koleksi Gambar Figural**: Tersedia 46 gambar raster terpotong presisi di `public/images/questions/` (`fig_analogi_01..17.png`, `fig_ketidaksamaan_01..14.png`, `fig_serial_01..15.png`).
5. **Masalah Soal Bergambar**:
   - `tryout-mini.json` masih mengarah ke path gambar lama yang 404 (`/images/questions/fig_page_0203.jpg`, dll).
   - Paket `tryout-figural` (46 soal lengkap dengan kunci resmi) sudah tersimpan di database Neon, tetapi belum didaftarkan di daftar paket `TRYOUT_LIST` pada halaman `/simulasi`.
   - Paket simulasi standar (tryout-1 s/d tryout-7) belum terintegrasi dengan soal figural pada nomor TIU 56-65.

---

## Arsitektur & Pendekatan

1. **Section Profil (`/profil`)**:
   - **Database**: Tambah kolom `avatar_url TEXT` pada tabel `users` (bisa menyimpan URL atau Data URL WebP terkompresi).
   - **API Backend**: 
     - `PATCH /api/user/profile`: Update nama pengguna & avatar_url dengan verifikasi session cookie.
     - `POST /api/user/avatar`: Menerima upload gambar (maks 2MB), kompresi atau simpan base64/file, kembalikan URL.
   - **Frontend**:
     - Buat halaman `src/app/profil/page.tsx` dengan kartu profil, upload/preview foto, input nama, statistik latihan pengguna, dan tombol Simpan.
     - Ubah komponen `src/components/Navbar.tsx`: Bungkus avatar dan nama dalam `<Link href="/profil">` agar dapat diklik langsung baik di desktop maupun mobile menu.
     - Sinkronisasi state via `window.dispatchEvent(new Event('auth-change'))` setelah profil diperbarui.

2. **Perbaikan Soal Bergambar**:
   - Perbaiki path gambar pada `src/data/packages/tryout-mini.json` agar mengarah ke `fig_analogi_01.png`, `fig_ketidaksamaan_01.png`, dan `fig_serial_01.png`.
   - Daftarkan paket `tryout-figural` ke dalam `TRYOUT_LIST` di `src/lib/loadPackage.ts` dan tampilkan badge "Spesial Figural" di halaman `/simulasi`.
   - Tambahkan unit test validasi keberadaan file gambar untuk setiap soal yang memiliki properti `image`.

---

## Langkah Pengerjaan Terperinci (Bite-Sized Tasks)

### Fase 1: Database & API Profil Pengguna

#### Task 1.1: Tambahkan Kolom `avatar_url` pada Schema Database
- **File**: `migrations/005_user_avatar.sql` & `src/lib/db.ts`
- **Aksi**:
  1. Buat migration `migrations/005_user_avatar.sql`:
     ```sql
     ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
     ```
  2. Update tipe `DbUser` di `src/lib/db.ts` untuk menyertakan `avatar_url?: string | null`.
  3. Tambahkan fungsi `updateUserProfile(userId: string, data: { name?: string; avatarUrl?: string }): Promise<DbUser | null>` di `src/lib/db.ts`.
- **Verifikasi**: Jalankan migration via endpoint/script DB dan pastikan fungsi `findUserById` mengembalikan kolom `avatar_url`.

#### Task 1.2: Buat Endpoint `PATCH /api/user/profile`
- **File**: `src/app/api/user/profile/route.ts`
- **Aksi**:
  - Ambil `cpns_token` dari cookies, verifikasi payload JWT via `verifyToken`.
  - Validasi input `name` (min 2 karakter, max 60 karakter).
  - Panggil `updateUserProfile(payload.userId, { name, avatarUrl })`.
  - Kembalikan response JSON `{ success: true, user: updatedUser }`.
- **Verifikasi**: Buat test `tests/user-profile.test.ts` untuk memverifikasi validasi input nama dan penolakan request tanpa cookie token (401).

#### Task 1.3: Update Endpoint `GET /api/auth/me`
- **File**: `src/app/api/auth/me/route.ts`
- **Aksi**:
  - Pastikan response me mengembalikan field `avatarUrl: dbUser?.avatar_url || null`.
- **Verifikasi**: Response `GET /api/auth/me` berisi field `avatarUrl`.

---

### Fase 2: Antarmuka Profil Pengguna (`/profil`) & Navbar

#### Task 2.1: Buat Halaman Profil `src/app/profil/page.tsx`
- **File**: `src/app/profil/page.tsx`
- **Aksi**:
  - Gunakan `useUser()` untuk mengambil data pengguna. Jika tidak login, redirect ke `/login?redirect=/profil`.
  - Komponen Avatar Uploader:
    - Lingkaran avatar besar dengan tombol kamera/ikon edit.
    - Input file tersembunyi (`accept="image/png, image/jpeg, image/webp"`).
    - Client-side image resize via HTML5 Canvas (resize ke 256x256 WebP/JPEG ~30KB) untuk efisiensi penyimpanan tanpa beban server besar.
  - Komponen Edit Nama:
    - Input nama lengkap dengan feedback karakter.
  - Ringkasan Akun:
    - Email pengguna (read-only dengan badge "Terverifikasi").
    - Tanggal pendaftaran akun.
  - Tombol "Simpan Perubahan":
    - Loading spinner saat proses simpan.
    - Notifikasi toast sukses (hijau).
    - Memicu `window.dispatchEvent(new Event('auth-change'))` agar Navbar seketika terupdate.
- **Verifikasi**: Render halaman berjalan tanpa error TypeScript (`npx tsc --noEmit`).

#### Task 2.2: Hubungkan Klik Profil di `src/components/Navbar.tsx`
- **File**: `src/components/Navbar.tsx`
- **Aksi**:
  - Di tampilan Desktop: Ubah pembungkus profil dari `<div>` menjadi `<Link href="/profil">` dengan efek hover yang jelas (`hover:bg-[var(--muted)] hover:ring-1 hover:ring-[var(--border)] cursor-pointer`).
  - Tampilkan foto profil custom jika `user.avatarUrl` tersedia (menggantikan inisial/ikon placeholder default).
  - Di tampilan Mobile: Tambahkan item menu "👤 Profil Saya" yang mengarah ke `/profil` sebelum tombol "Keluar".
- **Verifikasi**: Klik avatar atau nama di Navbar langsung mengarahkan pengguna ke `/profil`.

---

### Fase 3: Perbaikan Soal Figural Bergambar

#### Task 3.1: Perbaiki Path Gambar pada `tryout-mini.json`
- **File**: `src/data/packages/tryout-mini.json`
- **Aksi**:
  - Temukan 3 soal figural yang masih mereferensikan `fig_page_0203.jpg`, `fig_page_0205.jpg`, dan `fig_page_0176.jpg`.
  - Ganti path masing-masing ke gambar valid:
    - Soal 28: `/images/questions/fig_analogi_01.png`
    - Soal 29: `/images/questions/fig_ketidaksamaan_01.png`
    - Soal 30: `/images/questions/fig_serial_01.png`
- **Verifikasi**: Jalankan pengecekan keberadaan file dengan fs test.

#### Task 3.2: Daftarkan Paket `tryout-figural` di `TRYOUT_LIST`
- **File**: `src/lib/loadPackage.ts` & `src/app/simulasi/page.tsx`
- **Aksi**:
  - Tambahkan entry `tryout-figural` ke dalam `TRYOUT_LIST`:
    ```typescript
    {
      id: 'tryout-figural',
      label: 'Tryout Khusus Figural',
      desc: '46 soal kemampuan figural asli: Analogi Gambar, Ketidaksamaan, dan Serial (lengkap kunci pembahasan)',
      badge: 'Spesial Figural'
    }
    ```
  - Pastikan `loadPackage('tryout-figural')` membaca langsung dari tabel `questions` di database Neon (yang sudah terisi 46 soal figural resmi).
- **Verifikasi**: Buka `/api/questions/tryout-figural` dan pastikan mengembalikan 46 soal dengan HTTP 200.

#### Task 3.3: Tulis Test Regresi Validitas Gambar Soal
- **File**: `tests/figural-images.test.ts`
- **Aksi**:
  - Tulis test Vitest yang memindai semua soal yang memiliki properti `image` di paket `tryout-mini.json` dan `tryout-figural`:
    - Memastikan path diawali `/images/questions/`.
    - Memastikan file gambar fisik benar-benar ada di direktori `public/images/questions/`.
    - Memastikan ukuran file gambar > 1KB (bukan gambar rusak/kosong).
- **Verifikasi**: Jalankan `npx vitest run tests/figural-images.test.ts` dan pastikan 100% passed.

---

## Verifikasi & Validasi (Definition of Done)
1. **Test Suite**: Semua unit test Vitest berjalan hijau (`npx vitest run`, 65+ tests).
2. **Type Safety**: `npx tsc --noEmit` bersih tanpa error TypeScript.
3. **E2E Flow**:
   - Pengguna login dengan `pochita9887@gmail.com`.
   - Mengklik avatar di Navbar membuka `/profil`.
   - Mengubah nama dan memilih foto profil baru berhasil disimpan dan langsung terlihat di Navbar.
   - Membuka `Tryout Khusus Figural` menampilkan 46 soal dengan gambar terlihat tajam, opsi terbaca, dan fitur zoom berfungsi.
   - Membuka `Tryout Mini` menampilkan soal nomor 28, 29, 30 dengan gambar yang tidak 404.

---

## Risiko & Tradeoff
- **Penyimpanan Foto Profil**: Menggunakan Client-side Canvas Resize ke Data URL (WebP 256x256 < 40KB) disimpan langsung di kolom `avatar_url` database Neon.
  - *Keuntungan*: Zero-dependency, tidak butuh S3 bucket eksternal, tidak terhapus saat deployment Vercel ulang, instan.
  - *Tradeoff*: Menambah ukuran row tabel users sebesar ~30-40KB per user (sangat aman untuk PostgreSQL).
- **Fallback Tamu**: Jika pengguna belum login dan mengakses `/profil`, sistem otomatis me-redirect ke `/login?redirect=/profil`.
