# Plan: Batasan Fitur untuk Tamu (Guest) & Login Gate Modal

> **Goal:** Batasi akses fitur (Latihan Kilat, Flashcard, Roadmap 30 Hari, Psikotes, dan Riwayat) untuk pengguna yang belum login, dengan mengizinkan mereka mencoba 1 kali / 1 sampel per fitur, lalu menampilkan popup modal yang mewajibkan Registrasi / Login untuk membuka seluruh akses.

---

## 1. Current Context & Assumptions

- **Sistem Auth:** `src/lib/useUser.ts` mengekspos `{ user, loading }`. Jika user belum login, `user === null`.
- **Halaman Login:** `/login?redirect=<url>` telah mendukung redirect otomatis setelah login OTP berhasil.
- **Fitur yang Dibatasi:**
  1. **Latihan Kilat (`/drill/[category]/[subCategory]`):** User tamu diizinkan mencoba 1 sesi (10 butir soal). Saat sesi selesai (`isFinished === true`), popup login gate muncul, dan tombol "Latihan Lagi" / "Ganti Topik" terkunci hingga login.
  2. **Flashcard Hafalan (`/flashcard`):** User tamu diizinkan mencoba 1 kartu (flip dan pilih Hafal / Belum). Begitu aksi kartu pertama selesai, popup login gate muncul agar tidak bisa membuka dek kartu berikutnya tanpa akun.
  3. **Roadmap 30 Hari (`/journey`):** User tamu diizinkan mencentang 1 hari atau menekan tombol "Sudah Mengerjakan Hari Ini" 1 kali. Begitu ditekan, muncul popup login gate yang menjelaskan bahwa progres hanya tersimpan permanen jika memiliki akun.
  4. **Psikotes (`/psikotes/hasil`):** User tamu diizinkan mencoba 1 tes psikotes (Kraepelin atau Penalaran). Saat halaman hasil dimuat, popup login gate muncul untuk membuka grafik evaluasi lanjutan dan tes lainnya.
  5. **Riwayat (`/riwayat`):** Halaman riwayat langsung menampilkan popup login gate karena seluruh data riwayat dan tagihan memerlukan akun.
- **Desain & Tema:** Mengikuti palet Claude Amber (`#faf9f5`, `#c96442`, `#1e293b`), font Outfit, rounded corners, dan ikon dari `@phosphor-icons/react` saja. Dilarang `lucide-react`.

---

## 2. Architecture & Proposed Approach

Kita membuat satu komponen modal terpusat yang reusable:
`src/components/GuestLimitModal.tsx`

**Props Komponen:**
- `isOpen: boolean`
- `onClose?: () => void` (opsional; jika tidak disertakan, modal bersifat strict/wajib login)
- `featureName: string` (contoh: "Latihan Kilat", "Flashcard", "Roadmap 30 Hari", "Psikotes", "Riwayat Belajar")
- `title?: string`
- `description?: string`
- `redirectUrl?: string` (otomatis fallback ke pathname saat ini)

**Status Penyimpanan Coba Gratis (Guest Trial Tracking):**
Untuk mendeteksi apakah tamu sudah pernah mencoba fitur tersebut di peramban, kita gunakan key `localStorage` transient khusus tamu:
- `lolos_guest_tried_drill` (boolean)
- `lolos_guest_tried_flashcard` (boolean)
- `lolos_guest_tried_journey` (boolean)
- `lolos_guest_tried_psikotes` (boolean)

Jika flag ini `true` dan `!user`, halaman fitur langsung memunculkan modal login gate saat diakses kembali, mencegah tamu memakai fitur berulang kali tanpa mendaftar.

---

## 3. Step-by-Step Tasks

### Task 1: Buat Komponen `src/components/GuestLimitModal.tsx`
- **File:** `src/components/GuestLimitModal.tsx`
- **Tanggung Jawab:** Menampilkan modal elegan dengan backdrop blur, icon amber tebal, deskripsi keuntungan mendaftar, dan tombol CTA mengarah ke `/login?redirect=...`.
- **Verifikasi:** Komponen menerima props dan me-render tombol login dengan URI-encoded redirect path.

### Task 2: Pasang Gate di Latihan Kilat (`src/app/drill/[category]/[subCategory]/page.tsx`)
- **File:** `src/app/drill/[category]/[subCategory]/page.tsx`
- **Alur:**
  1. Saat komponen mount, cek jika `!user && localStorage.getItem('lolos_guest_tried_drill') === 'true'` -> langsung buka `GuestLimitModal`.
  2. Saat user tamu menyelesaikan 10 soal (masuk ke `isFinished`), set `localStorage.setItem('lolos_guest_tried_drill', 'true')` dan buka `GuestLimitModal`.
  3. Tombol "Latihan Lagi" memeriksa auth: jika belum login, buka modal kembali.

### Task 3: Pasang Gate di Flashcard (`src/app/flashcard/page.tsx`)
- **File:** `src/app/flashcard/page.tsx`
- **Alur:**
  1. Di dalam `FlashcardContent`: jika `!user && localStorage.getItem('lolos_guest_tried_flashcard') === 'true'`, buka `GuestLimitModal`.
  2. Saat tamu menekan tombol "Hafal" atau "Belum Hafal" pada kartu pertama, tandai `lolos_guest_tried_flashcard = 'true'` dan tampilkan `GuestLimitModal`.
  3. Tamu tidak bisa lanjut ke kartu ke-2 dan seterusnya tanpa akun.

### Task 4: Pasang Gate di Roadmap 30 Hari (`src/app/journey/page.tsx`)
- **File:** `src/app/journey/page.tsx`
- **Alur:**
  1. Jika tamu menekan tombol "Sudah Mengerjakan Hari Ini" atau toggle centang hari:
     - Biarkan aksi pertama dieksekusi agar tamu merasakan fiturnya.
     - Segera buka `GuestLimitModal`: "Simpan Progres Roadmap 30 Hari Kamu".
     - Catat `lolos_guest_tried_journey = 'true'`.
  2. Jika tamu kembali ke halaman setelah mencoba 1 kali, tampilkan banner / modal ajakan login.

### Task 5: Pasang Gate di Psikotes (`src/app/psikotes/hasil/page.tsx` & `/psikotes/page.tsx`)
- **File:** `src/app/psikotes/hasil/page.tsx`
- **Alur:**
  1. Pada halaman hasil psikotes (`/psikotes/hasil`), jika `!user`, tampilkan skor ringkas tamu, lalu buka `GuestLimitModal`: "Buka Seluruh Paket & Analisis Psikotes".
  2. Catat `lolos_guest_tried_psikotes = 'true'`.
  3. Pada halaman `/psikotes` (hub pemilihan tes), jika sudah pernah mencoba 1 kali dan belum login, tampilkan banner ajakan login saat memilih tes berikutnya.

### Task 6: Pasang Gate di Riwayat Belajar (`src/app/riwayat/page.tsx`)
- **File:** `src/app/riwayat/page.tsx`
- **Alur:**
  1. Halaman `/riwayat` memerlukan identitas user. Jika `!user && !userLoading`, render empty/locked state dengan tombol login atau tampilkan `GuestLimitModal`.

---

## 4. Tests & Validation Plan

1. **Test Latihan Kilat:**
   - Masuk `/drill/twk/nasionalisme` dalam kondisi logout.
   - Jawab 10 soal sampai selesai.
   - **Hasil:** Layar hasil menampilkan modal popup `GuestLimitModal` berisi pesan "Daftar / Masuk Akun Gratis".
2. **Test Flashcard:**
   - Masuk `/flashcard` dalam kondisi logout.
   - Buka kartu 1, klik "Hafal".
   - **Hasil:** Kartu 1 selesai, langsung muncul popup `GuestLimitModal` untuk mendaftar akun agar bisa akses dek selanjutnya.
3. **Test Roadmap:**
   - Masuk `/journey` dalam kondisi logout.
   - Klik "Sudah Mengerjakan Hari Ini".
   - **Hasil:** Hari tercentang + langsung muncul popup peringatan login agar progres tidak hilang.
4. **Test Psikotes:**
   - Masuk `/psikotes/penalaran` dalam kondisi logout.
   - Selesaikan tes sampai dialihkan ke `/psikotes/hasil?type=penalaran`.
   - **Hasil:** Hasil muncul dan `GuestLimitModal` terbuka otomatis.
5. **Test Build:**
   - Jalankan `npm run build` -> exit code 0.

---

## 5. Risks & Tradeoffs

- **UX Friction vs Conversion:** Mengizinkan 1x coba memberi "aha moment" kepada user baru sebelum meminta registrasi. Ini jauh lebih efektif dibanding langsung mengunci di halaman awal (hard-wall).
- **Graceful Re-entry:** Ketika user login via OTP dan kembali lewat `?redirect=...`, modal limit tidak boleh muncul lagi karena `user` sudah terverifikasi.
