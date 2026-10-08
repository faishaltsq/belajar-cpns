# Implementation Plan: Pure Figural Section & Answer Key Verification

Pastikan seluruh paket pada section **Figural** di menu Tryout hanya berisi 100% soal bergambar tanpa campuran teks biasa, relasi gambar ke file fisik valid, opsi skor dan kunci jawaban 100% akurat, serta `tryout-8` s/d `tryout-17` dipindahkan ke section `standard` sesuai format 110 soal CAT BKN.

---

## 1. Current Context & Assumptions

- **Total Gambar Figural**: 128 file PNG unik tersimpan di `public/images/questions/`:
  - 46 file dari Set 1 (`fig_analogi_01..17.png`, `fig_ketidaksamaan_01..14.png`, `fig_serial_01..15.png`).
  - 82 file dari Set 2 (`fig_tiu_01..15.png`, `fig_variasi_01..20.png`, `fig_seri_01..15.png`, `fig_persamaan_01..15.png`, `fig_bumn3_q06..15.png`, `fig_modul1_01..08.png`).
- **Masalah Saat Ini**:
  1. Section `special` (label tab "Figural" di `/simulasi`) bercampur antara paket murni figural (`tryout-figural`, `tryout-figural-2`) dan paket tryout umum 110 soal (`tryout-8` s/d `tryout-17`).
  2. Paket `tryout-8` s/d `tryout-17` berisi 110 soal (30 TWK, 35 TIU, 45 TKP) dan hanya 12 soal bergambar di dalamnya — tidak cocok berada di bawah filter/section "Figural".
  3. Mode **Drill Figural** (`/drill/TIU/Figural`) saat ini mengambil soal dari `tryout-1` yang 0% bergambar sehingga gagal menampilkan soal gambar.
- **Kunci Jawaban Resmi**:
  - `tryout-figural` (46 butir): Kunci dari `figural_answer_keys.json` (Analogi: 1-17, Ketidaksamaan: 1-14, Serial: 1-15).
  - `tryout-figural-2` (82 butir): Kunci resmi dari Ebook BKN/Kedinasan 2024 (`TIU SKD CPNS.pdf`, `Soal-CPNS-Paket-1.pdf`, `5_6327771640704796042.pdf`, dan `SOAL FIGURAL 1.pdf`).

---

## 2. Architecture & Proposed Approach

1. **Reklasifikasi Section Tryout**:
   - Pindahkan `tryout-8` s/d `tryout-17` ke `section: 'standard'` (karena merupakan paket CAT BKN 110 soal).
   - Jadikan `section: 'special'` (Tab "Figural") murni berisi paket spesialisasi figural:
     - **Paket Figural I — Analogi, Ketidaksamaan & Serial (46 Soal, 45 Menit)**
     - **Paket Figural II — Seri, Pola & Persamaan BKN (50 Soal, 50 Menit)**
     - **Paket Figural III — Jaring 3D, Rotasi & HOTS 2024 (32 Soal, 35 Menit)**
     - *(Atau 2 paket komprehensif: `tryout-figural` 46 Soal & `tryout-figural-2` 82 Soal)*
2. **Validasi & Sanitasi Data Soal (Database & Static JSON)**:
   - Setiap soal di paket figural **wajib** memiliki `image: '/images/questions/fig_*.png'` yang file fisiknya ada di disk.
   - Setiap opsi jawaban `options` memiliki score `5` untuk kunci yang benar dan `0` untuk opsi lainnya.
   - Field `correct_answer` konsisten dengan huruf id opsi (`A`, `B`, `C`, `D`, `E`).
   - Teks instruksi soal bersih tanpa prefix artefak "Soal nomor X".
3. **Drill Mode Figural Support**:
   - Perbaiki `src/app/drill/[category]/[subCategory]/page.tsx` agar saat `subCategory === 'Figural'` memuat langsung dari pool soal figural bergambar (`/api/questions/tryout-figural-2` atau `src/data/figural_bank_full.json`).

---

## 3. Step-by-Step Tasks

### Task 1: Reorganisasi Paket Tryout di `src/lib/loadPackage.ts`
- **File**: `src/lib/loadPackage.ts`
- **Aksi**:
  1. Ubah `section` untuk `tryout-8` s/d `tryout-17` menjadi `'standard'`.
  2. Definisikan paket pada `special` (Figural) hanya untuk paket murni figural:
     - `tryout-figural`: 46 soal bergambar (45 menit)
     - `tryout-figural-2`: 82 soal bergambar (80 menit)
  3. Pastikan `STATIC_PACKAGES` memiliki loader untuk `tryout-figural` dan `tryout-figural-2`.
- **Snippet Perubahan**:
```ts
// ── standard ──
{ id: 'tryout-3', label: 'Tryout 3', desc: 'Soal UUD 1945, penalaran induktif, dan bela negara', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-4', label: 'Tryout 4', desc: 'Wawasan NKRI, sinonim/antonim, dan TKP orientasi', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-5', label: 'Tryout 5', desc: 'Sejarah Indonesia, kuantitatif, dan TKP adaptasi', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-6', label: 'Tryout 6', desc: 'Bhinneka Tunggal Ika, deduktif, dan kepemimpinan', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-7', label: 'Tryout 7', desc: 'Pilar Kebangsaan, silogisme, dan TKP jejaring kerja', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-8', label: 'Tryout 8', desc: 'Standar CAT BKN — 110 soal resmi + simulasi figural', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-9', label: 'Tryout 9', desc: 'Standar CAT BKN — 110 soal resmi + simulasi figural', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-10', label: 'Tryout 10', desc: 'Standar CAT BKN — 110 soal resmi + simulasi figural', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-11', label: 'Tryout 11', desc: 'Standar CAT BKN — 110 soal resmi + simulasi figural', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-12', label: 'Tryout 12', desc: 'Standar CAT BKN — 110 soal resmi + simulasi figural', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-13', label: 'Tryout 13', desc: 'Standar CAT BKN — 110 soal resmi + simulasi figural', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-14', label: 'Tryout 14', desc: 'Standar CAT BKN — 110 soal resmi + simulasi figural', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-15', label: 'Tryout 15', desc: 'Standar CAT BKN — 110 soal resmi + simulasi figural', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-16', label: 'Tryout 16', desc: 'Standar CAT BKN — 110 soal resmi + simulasi figural', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
{ id: 'tryout-17', label: 'Tryout 17', desc: 'Standar CAT BKN — 110 soal resmi + simulasi figural', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
// ── special (100% Figural Bergambar) ──
{ id: 'tryout-figural', label: 'Tryout Figural Khusus I', desc: '46 butir soal murni figural bergambar: Analogi, Ketidaksamaan, & Serial Pola BKN', badge: 'Bergambar', section: 'special', questionCount: 46, durationMin: 45 },
{ id: 'tryout-figural-2', label: 'Tryout Figural Khusus II', desc: '82 butir soal murni figural: Serial Pola, Persamaan, Jaring-jaring Ruang 3D, & Rotasi', badge: 'Terbaru', section: 'special', questionCount: 82, durationMin: 80 },
```
- **Verifikasi**: `npm run build` berhasil tanpa error.

---

### Task 2: Buat JSON Statis Fallback untuk Paket Figural
- **File**: `src/data/packages/tryout-figural.json` dan `src/data/packages/tryout-figural-2.json`
- **Aksi**:
  1. Pastikan `src/data/packages/tryout-figural.json` berisi 46 soal figural terverifikasi (dari DB `tryout-figural`).
  2. Salin data dari `src/data/figural_bank_full.json` ke `src/data/packages/tryout-figural-2.json` dengan format `Question[]` yang valid.
  3. Daftarkan di `STATIC_PACKAGES` di `src/lib/loadPackage.ts`:
     ```ts
     'tryout-figural': () => import('@/data/packages/tryout-figural.json').then((m) => m.default as unknown as Question[]).catch(() => []),
     'tryout-figural-2': () => import('@/data/packages/tryout-figural-2.json').then((m) => m.default as unknown as Question[]).catch(() => []),
     ```
- **Verifikasi**: `node -e "require('./src/data/packages/tryout-figural-2.json')"` memuat array 82 item.

---

### Task 3: Audit & Sinkronisasi Database PostgreSQL untuk Paket Figural
- **File**: Database tabel `packages` dan `questions`
- **Aksi**:
  1. Jalankan script audit verifikasi DB untuk memastikan:
     - `tryout-figural` memiliki 46 baris questions, semua `image IS NOT NULL`, `category = 'TIU'`, `correct_answer` valid, `options` memiliki score 5 pada opsi yang tepat.
     - `tryout-figural-2` memiliki 82 baris questions, semua `image IS NOT NULL`, `category = 'TIU'`, `correct_answer` valid.
  2. Perbarui tabel `packages`:
     ```sql
     UPDATE packages SET question_count = 46, duration_sec = 2700 WHERE id = 'tryout-figural';
     UPDATE packages SET question_count = 82, duration_sec = 4800 WHERE id = 'tryout-figural-2';
     ```
- **Verifikasi**: Query SQL mengonfirmasi 0 soal tanpa gambar di kedua paket tersebut.

---

### Task 4: Perbaiki Mode Drill Figural (`/drill/TIU/Figural`)
- **File**: `src/app/drill/[category]/[subCategory]/page.tsx`
- **Aksi**:
  1. Tambahkan kondisi khusus saat `subCategoryDecoded.toLowerCase() === 'figural'`:
     - Alih-alih fetch `/api/questions/tryout-1`, fetch `/api/questions/tryout-figural-2` (atau fallback `/api/questions/tryout-figural`).
     - Filter soal yang memiliki `q.image` valid.
     - Acak 10 soal figural bergambar untuk sesi drill cepat.
- **Snippet Perubahan**:
```ts
useEffect(() => {
  const isFigural = subCategoryDecoded.toLowerCase() === 'figural';
  const targetPackage = isFigural ? 'tryout-figural-2' : 'tryout-1';

  fetch(`/api/questions/${targetPackage}`)
    .then((r) => (r.ok ? r.json() : { questions: [] }))
    .then((d) => {
      const all: Question[] = (d.questions || []).map((q: Question) => ({
        ...q,
        text: stripQuestionPrefix(q.text),
      }));
      let matched = isFigural
        ? all.filter((q) => Boolean(q.image))
        : all.filter(
            (q) =>
              q.category.toUpperCase() === params.category.toUpperCase() &&
              q.subCategory?.toLowerCase() === subCategoryDecoded.toLowerCase()
          );
      if (matched.length < 5 && !isFigural) {
        matched = all.filter(
          (q) => q.category.toUpperCase() === params.category.toUpperCase()
        );
      }
      const shuffled = [...matched].sort(() => 0.5 - Math.random()).slice(0, 10);
      setQuestions(shuffled);
    })
    .catch(() => {})
    .finally(() => setLoading(false));
}, [params.category, subCategoryDecoded]);
```
- **Verifikasi**: Buka `/drill/TIU/Figural` di browser/API dan verifikasi 10 soal yang dimuat semuanya memiliki ilustrasi gambar figural.

---

### Task 5: Validasi Integritas Kunci Jawaban & Rendering Gambar
- **File**: `tests/verify-figural-integrity.mjs` (skrip audit independen)
- **Aksi**:
  1. Buat skrip audit yang memeriksa seluruh 128 soal figural:
     - Cek keberadaan file gambar di disk (`fs.existsSync(publicPath)`).
     - Cek kesesuaian format data options (`Array of Option` dengan 4 atau 5 opsi).
     - Cek bahwa tepat 1 opsi memiliki `score: 5` dan sisanya `score: 0`.
     - Cek bahwa `correct_answer` cocok dengan opsi ber-score 5.
     - Cek bahwa tidak ada teks placeholder rusak.
- **Verifikasi**: Skrip keluar dengan exit code `0` dan mencetak `All 128 Figural Questions 100% Valid`.

---

## 4. Tests & Validation Plan

1. **Unit / Integrity Script**:
   - `node scripts/verify-figural.js` → Memeriksa 128 file gambar dan seluruh relasi kunci jawaban.
2. **Build Verification**:
   - `npm run build` → Harus selesai dengan exit code `0`.
3. **UI / Functional Verification**:
   - Halaman `/simulasi`: Filter tab "Figural" hanya menampilkan paket yang 100% bergambar (`Tryout Figural Khusus I` & `Tryout Figural Khusus II`).
   - Halaman `/simulasi/tryout-figural` & `/simulasi/tryout-figural-2`: Setiap nomor soal dari 1 sampai akhir menampilkan gambar PNG dengan fitur zoom, opsi A-E rapi, dan skor dihitung benar saat submit.
   - Halaman `/drill/TIU/Figural`: Menampilkan 10 soal acak bergambar murni.

---

## 5. Risks & Tradeoffs

- **Ukuran Bundle / Database**: Gambar disimpan sebagai file statis di `public/images/questions/` (total ~15 MB), bukan full inline base64 di JSON statis, sehingga ukuran bundle build tetap ringan dan efisien.
- **Kompatibilitas User Pro**: Paket `tryout-figural` dan `tryout-figural-2` otomatis terbuka bagi pengguna berstatus PRO via validasi role di `/api/user/status`.

---

Plan tersimpan di `.hermes/plans/2026-10-08_103000-pure-figural-section-and-answer-key-verification.md`.