# Rencana Peningkatan Profesionalitas & Pengalaman Belajar Lolos.in

## Goal
Meningkatkan kenyamanan belajar, variasi latihan, dan profesionalitas simulasi CAT di Lolos.in melalui:
1. **Mode Tryout Resmi (Simulasi Test Beneran)** vs **Mode Latihan Mandiri**.
2. **Navigasi Tombol Exit / Pause** yang aman di setiap sesi latihan dan simulasi.
3. **Ergonomi Ujian**: Shortcut keyboard, pengatur ukuran font, dan eliminasi opsi (coret jawaban salah).
4. **Manajemen Waktu**: Timer warning dan deteksi "Time Trap" per butir soal.
5. **Aksi Lanjutan**: 1-klik latihan fokus pada subkategori terlemah dari kartu diagnostik.

---

## Current Context / Assumptions
- **Tech Stack**: Next.js 14 App Router, TypeScript, Tailwind CSS, Neon PostgreSQL, Vitest.
- **Tampilan UI**: Claude Amber (`#faf9f5` warm cream, `#c96442` terracotta, Outfit font). Icon Phosphor Icons (`@phosphor-icons/react`).
- **Fitur Saat Ini**:
  - Simulasi CAT standar 110 soal (`/simulasi/[id]`) dengan toggle tampilan Modern vs BKN.
  - Drill kilat 10 soal instan per subkategori (`/drill/[category]/[subCategory]`).
  - Bedah soal paska ujian 4 filter (`/simulasi/hasil/[resultId]`) + leaderboard + kartu diagnostik subkategori.
  - Riwayat tryout tersimpan di `localStorage` & tersinkron ke tabel `exam_results`.
  - Database berisi 6.800+ referensi soal/materi dari 400+ ebook CPNS.
- **Gap yang Diperbaiki**:
  1. *Tidak Ada Navigasi Exit / Pause*: Di sesi drill tidak ada tombol keluar yang elegan. Di simulasi tidak ada jeda darurat (pause) atau tombol "Keluar & Simpan Draf".
  2. *Kurang Nuansa Ujian Nyata (Mode Tryout Resmi)*: Belum ada pemisahan tegas antara "Mode Simulasi Ujian Beneran" (kondisi ketat BKN: countdown tanpa jeda, fullscreen prompt, peringatan pindah tab) vs "Mode Latihan Santai" (bisa pause, santai).
  3. *Ergonomi Ujian*: Peserta harus klik mouse 110 kali; belum ada keyboard shortcut (A-E, Panah, R).
  4. *Kenyamanan Visual*: Teks soal panjang font statis, belum ada pengaturan ukuran teks.
  5. *Strategi Eliminasi*: Belum ada fitur coret opsi yang diyakini salah.
  6. *Analitik Overthinking*: Belum ada pelacakan waktu per butir soal.

---

## Architecture & Proposed Approach

### 1. Sistem Mode Tryout: Resmi vs Latihan Mandiri
Di halaman awal `/simulasi/[id]` atau `/simulasi`, user dapat memilih:
- **🏆 Mode Tryout Resmi (Simulasi BKN Sebenarnya)**:
  - Timer ketat (strict countdown): **TIDAK BISA di-pause**.
  - Rekomendasi otomatis masuk Fullscreen (`requestFullscreen`).
  - Deteksi ganti tab (`visibilitychange` / `window.onblur`) dengan pencatatan peringatan pelanggaran fokus.
  - Layout BKN default / authentic CAT layout.
  - Hasil langsung dipublikasikan ke Leaderboard Nasional.
- **📖 Mode Latihan Mandiri**:
  - Tombol **Pause / Jeda** aktif: Menghentikan timer dan mem-blur layar soal agar peserta bisa istirahat sejenak tanpa curang membaca soal.
  - Tombol **Keluar & Simpan Draf**: Progress tersimpan dan dapat dilanjutkan dari halaman `/riwayat`.

### 2. Navigasi Exit / Pause di Drill (`/drill/[category]/[subCategory]`)
- Tambahkan header navigation bar:
  - Tombol **Keluar / Selesai Sesi**: Modal konfirmasi "Keluar dari Latihan Kilat? Progres sesi ini akan ditutup."
  - Tombol **Jeda / Pause**: Menahan sesi latihan.

### 3. State & Ergonomi Komponen Ujian
- Global keyboard listener: A-E untuk opsi, ArrowLeft/Right untuk nomor soal, R untuk ragu.
- Pengatur ukuran teks: Tiga opsi (`A-` 13px, `A` 14px, `A+` 16px) tersimpan di storage.
- Strikethrough opsi salah (`eliminatedOptionIds`).

---

## Step-by-Step Tasks

### Task 1: Navigasi Exit & Pause di Sesi Drill Latihan Kilat
- **Files**:
  - Component: `src/app/drill/[category]/[subCategory]/page.tsx`
- **Tujuan**: Memberikan kontrol keluar/jeda yang jelas saat user berlatih cepat tanpa kehilangan arah.
- **Langkah Kerja**:
  1. Tambahkan bar navigasi atas di `drill/[category]/[subCategory]/page.tsx` berisi tombol `✕ Keluar Latihan` dan tombol `⏸ Jeda`.
  2. Implementasikan modal konfirmasi keluar dengan 2 pilihan: "Lanjut Latihan" atau "Keluar ke Menu Drill".
  3. Saat dijeda, tampilkan overlay kartu: "Sesi Dijeda — Ambil nafas sejenak" dengan tombol "Lanjutkan".
- **Verifikasi**: Buka `/drill/TWK/Pilar%20Pancasila`, klik tombol `✕ Keluar`, modal konfirmasi muncul dan mengarahkan kembali ke `/drill`.

### Task 2: Fitur Pause (Jeda) & Exit Modal pada Simulasi CAT
- **Files**:
  - Component baru: `src/components/PauseExamModal.tsx`
  - Component baru: `src/components/ExitExamModal.tsx`
  - Implementation: `src/app/simulasi/[id]/page.tsx`
- **Tujuan**: Memungkinkan jeda darurat pada mode latihan dan keluar aman dengan pilihan simpan draf.
- **Langkah Kerja**:
  1. Buat `PauseExamModal.tsx`:
     - Muncul saat user klik tombol `⏸ Jeda` di header simulasi.
     - Timer berhenti, area kartu soal diberi filter `blur-md select-none` untuk mencegah kecurangan.
     - Menampilkan sisa waktu dan tombol "Lanjutkan Ujian".
  2. Buat `ExitExamModal.tsx`:
     - Pilihan 1: "Simpan Draf & Keluar" (menyimpan jawaban & sisa waktu ke `localStorage` dengan key `draft_exam_<id>`).
     - Pilihan 2: "Selesaikan Ujian Sekarang & Nilai" (menjalankan `submitExam()`).
     - Pilihan 3: "Batal Keluar".
  3. Pasang kedua tombol di header `simulasi/[id]/page.tsx` (di samping timer dan mode switcher).
- **Verifikasi**: Klik Pause saat simulasi berjalan -> timer berhenti dan soal ter-blur -> klik Lanjutkan -> timer berjalan normal kembali.

### Task 3: Mode Tryout Resmi (Simulasi BKN Sebenarnya) vs Mode Latihan
- **Files**:
  - Test: `tests/exam-mode.test.ts`
  - Helper: `src/lib/examMode.ts`
  - Modal Selector: `src/components/ExamModeModal.tsx`
  - Implementation: `src/app/simulasi/[id]/page.tsx`
  - UI Header: `src/components/BKNThemeLayout.tsx`
- **Tujuan**: Memberikan pengalaman simulasi nyata yang presisi dengan aturan ketat BKN.
- **Langkah Kerja**:
  1. Buat modal pemilihan mode saat pertama kali membuka `/simulasi/[id]`:
     - **Mode Tryout Resmi**: Fullscreen otomatis, no pause, timer ketat 100 menit, deteksi tab switch, terdaftar di Leaderboard.
     - **Mode Latihan Mandiri**: Fitur pause aktif, navigasi bebas, draf tersimpan.
  2. Simpan pilihan mode di state `examType: 'official' | 'practice'`.
  3. Pada Mode Tryout Resmi:
     - Nonaktifkan tombol pause (tampilkan tooltip: *"Pause dinonaktifkan pada Mode Tryout Resmi"*).
     - Pasang listener `visibilitychange`: jika peserta ganti tab, catat counter `tabSwitchCount`. Tampilkan warning banner halus: *"Peringatan: Berpindah tab terdeteksi (X kali)"*.
     - Header BKN menampilkan ID Peserta simulasi, Foto inisial, dan Nama.
- **Verifikasi**: `npm test tests/exam-mode.test.ts` pass, modal muncul saat awal ujian.

### Task 4: Keyboard Shortcuts & Ergonomic Navigation Engine
- **Files**:
  - Test: `tests/keyboard-navigation.test.ts`
  - Helper: `src/lib/examShortcuts.ts`
  - Implementation: `src/app/simulasi/[id]/page.tsx`
- **Tujuan**: Mengerjakan ujian tanpa mouse (A/B/C/D/E untuk opsi, ArrowLeft/Right untuk navigasi, R untuk ragu, Space untuk jeda).
- **Langkah Kerja**:
  1. Buat test `tests/keyboard-navigation.test.ts` memetakan keydown event ke aksi.
  2. Implementasikan helper `src/lib/examShortcuts.ts`.
  3. Pasang di `simulasi/[id]/page.tsx` dengan guard (hanya aktif saat tidak ada modal buka dan target bukan input teks).
  4. Tambahkan badge visual shortcut kecil `[A] [B] [C] [D] [E]` pada opsi dan `[← Prev] [Next →]` pada navigasi.
- **Verifikasi**: `npm test tests/keyboard-navigation.test.ts` pass, pencet `A` di keyboard memilih opsi A.

### Task 5: Eliminasi Opsi (Coret Jawaban Salah) & Pengatur Ukuran Font
- **Files**:
  - Component: `src/components/QuestionCard.tsx`
  - Component: `src/components/BKNThemeLayout.tsx`
- **Tujuan**: Membantu teknik eliminasi pilihan ganda dan kenyamanan penglihatan membaca soal panjang.
- **Langkah Kerja**:
  1. Tambahkan state `eliminatedOptions` di parent ujian.
  2. Pada setiap baris opsi, tambahkan tombol coret kecil (atau klik tombol strikethrough). Saat dicoret, opsi berubah abu-abu dan teks bergaris coret (`line-through opacity-40`).
  3. Tambahkan toggle ukuran font di header kartu soal (`A-` 13px, `A` 14px, `A+` 16px).
- **Verifikasi**: Klik tombol coret pada opsi B -> teks opsi B tercoret dan tidak bisa terpilih kecuali coretannya dibatalkan.

### Task 6: Timer Warning & Critical Time Indicator
- **Files**:
  - Component: `src/components/Timer.tsx`
- **Tujuan**: Memberi peringatan visual halus saat sisa waktu 10 menit (kuning) dan 5 menit (merah berkedip lembut).
- **Langkah Kerja**:
  1. Di `Timer.tsx`, tambahkan threshold check (600s dan 300s).
  2. Saat sisa waktu <= 300 detik, terapkan border merah menyala dan badge `Sisa Waktu Kritis`.
- **Verifikasi**: Render timer dengan 250 detik -> warna teks merah dan badge menyala.

### Task 7: Time Tracking per Soal & Deteksi "Time Trap" (Overthinking)
- **Files**:
  - Test: `tests/time-tracking.test.ts`
  - Helper: `src/lib/timeTracker.ts`
  - Implementation: `src/app/simulasi/[id]/page.tsx`
  - UI: `src/components/ExamQuestionReview.tsx`
- **Tujuan**: Mencatat berapa detik dihabiskan di tiap butir soal untuk menganalisa soal yang membuang waktu.
- **Langkah Kerja**:
  1. Buat unit test `tests/time-tracking.test.ts`.
  2. Implementasikan tracking akumulasi delta waktu antar index soal di `simulasi/[id]/page.tsx`.
  3. Simpan data durasi per soal ke hasil ujian.
  4. Di `ExamQuestionReview.tsx`, pasang badge durasi:
     - Hijau: < 50s (Efisien)
     - Kuning: 50-90s (Wajar)
     - Merah: > 90s (*Time Trap / Jebakan Waktu*)
- **Verifikasi**: `npm test tests/time-tracking.test.ts` pass.

### Task 8: 1-Click Action Loop dari Kartu Diagnostik ke Latihan Kilat
- **Files**:
  - Component: `src/components/DiagnosticReportCard.tsx`
- **Tujuan**: Menghubungkan diagnosa kelemahan langsung ke latihan kilat spesifik.
- **Langkah Kerja**:
  1. Pada kartu diagnostik subkategori berstatus `LEMAH`, tampilkan tombol: `⚡ Latih 10 Soal Ini`.
  2. Tombol me-link langsung ke `/drill/${sub.category}/${encodeURIComponent(sub.name)}`.
- **Verifikasi**: Klik tombol pada subkategori lemah langsung membuka sesi latihan materi tersebut.

### Task 9: Pembahasan Terstruktur ("Konsep Kunci" & "Trik Cepat")
- **Files**:
  - Test: `tests/explanation-parser.test.ts`
  - Helper: `src/lib/explanationParser.ts`
  - Component: `src/components/ExamQuestionReview.tsx`
- **Tujuan**: Memisahkan materi inti dan trik eliminasi pada pembahasan soal paska ujian.
- **Langkah Kerja**:
  1. Buat parser sederhana mendeteksi "Tips:", "Trik Cepat:", "Kunci:" di pembahasan.
  2. Render box terpisah dengan latar khusus dan ikon Phosphor.
- **Verifikasi**: `npm test tests/explanation-parser.test.ts` pass.

### Task 10: Full Regression Test, Build & Deploy Verification
- **Files**:
  - Seluruh test suite
- **Tujuan**: Memastikan seluruh 46+ test lama + test baru tetap hijau tanpa error TypeScript.
- **Langkah Kerja**:
  1. `npm test` -> semua test pass.
  2. `npm run build` -> build clean.
  3. Git commit & push ke master.
- **Verifikasi**: 50+ unit test pass, build production sukses.

---

## Tests / Validation Plan
- **Checklist Pengujian**:
  - [ ] Tombol Exit & Pause di Drill berfungsi dengan modal konfirmasi.
  - [ ] Tombol Pause di Simulasi mem-pause countdown dan mem-blur soal.
  - [ ] Tombol Exit di Simulasi menyediakan opsi "Simpan Draf" vs "Kumpulkan & Nilai".
  - [ ] Mode Tryout Resmi menolak pause dan mencatat ganti tab.
  - [ ] Shortcut keyboard `A-E`, `Panah`, dan `R` berfungsi tanpa bug di input text.
  - [ ] Coret opsi (strikethrough) menurunkan opasitas dan mencoret teks opsi.
  - [ ] Time tracking mencatat durasi detik per nomor soal dan menampilkan badge Time Trap di bedah soal.
  - [ ] Tombol 1-click drill di hasil diagnostik mengarahkan ke subkategori yang benar.

---
*Dokumen rencana diperbarui dan disimpan di `.hermes/plans/2026-09-30_160000-cpns-ux-learning-professional-upgrade.md`.*
