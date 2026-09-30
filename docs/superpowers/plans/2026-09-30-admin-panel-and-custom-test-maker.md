# Admin Panel, Custom Test Maker, & Soal Bergambar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun Admin Panel (`/admin`) untuk mengelola seluruh paket ujian, generator tes kustom (contoh tes 30 soal: 10 TWK, 10 TIU, 10 TKP), dukungan soal bergambar (ekstraksi ebook figural/spasial & scraping online), serta viewer visual di ruang ujian.

**Architecture:** 
1. **Model & Schema Extension**: Menambahkan optional field `image?: string` pada interface `Question` dan `Option` di `src/lib/types.ts`.
2. **Admin API & Storage**: Endpoint CRUD `/api/admin/packages` dan `/api/admin/generate-custom` untuk mengedit paket yang tersimpan di `src/data/packages/` atau database Supabase, serta upload/scraping media ke `public/images/questions/`.
3. **Asset Pipeline**: Script ekstraksi gambar spesifik soal figural dari PDF E-Book menggunakan `pymupdf` dan modul web scraper/image fetcher untuk soal visual.
4. **Admin Panel UI (`/admin`)**: Dashboard berbasis token oklch modern untuk mengelola paket soal (tambah/edit/hapus butir soal, ganti kunci/bobot, preview gambar), serta UI Custom Test Builder (atur komposisi butir soal per subtes).
5. **Exam Runner Image Support**: Render gambar pertanyaan (`QuestionCard.tsx`) dan pilihan jawaban gambar secara responsif dengan lazy loading dan modal zoom gambar.

**Tech Stack:** Next.js 14 App Router, TypeScript, PyMuPDF (python lokal), Phosphor Icons, Tailwind CSS, Vitest.

---

## Global Constraints

- **Design System**: Mengikuti sistem token monochrome oklch Vercel-style yang sudah diatur di `src/app/globals.css`.
- **Icons**: Wajib menggunakan `@phosphor-icons/react` dengan prop `size={N}` dan `weight`, dilarang `lucide-react`.
- **Test Integrity**: Vitest wajib tetap lulus 100% (39/39 passing + test baru untuk generator kustom & schema image).
- **Responsive Media**: Semua gambar soal disimpan lokal di `/public/images/questions/` dengan penamaan terstruktur (`pkg-[id]-q[num].png`) agar mandiri tanpa dependensi external URL yang rapuh.

## Review Focus

1. **Format Image Tidak Valid**: Jika field `image` berisi URL mati atau file hilang, UI tidak boleh crash dan menampilkan placeholder fallback yang bersih.
2. **Scoring Dinamis Pada Kustom Test**: Custom test 30 butir (10 TWK, 10 TIU, 10 TKP) memiliki passing grade proporsional, bukan flat 65/80/166 (karena total soal lebih sedikit).
3. **Konkurensi Penyimpanan Paket**: Modifikasi paket oleh admin tidak boleh merusak struktur array 110 butir soal paket resmi.
4. **Security / Guard Admin**: Akses `/admin` harus dilindungi PIN/Master Key agar tidak sembarang pengunjung web bisa mengubah bank soal.
5. **Ekstraksi Gambar Figural**: Filter gambar kecil/header/footer PDF (< 5KB atau dimensi < 80px) agar hanya diagram/soal figural yang diekstrak.

---

### Task 1: Extend Question Schema & Scoring for Flexible Test Sizes

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/scoring.ts`
- Test: `tests/scoring.test.ts`
- Test: `tests/custom-test.test.ts`

**Interfaces:**
- `Question`: Tambah `image?: string` dan optional `imageCaption?: string`.
- `Option`: Tambah `image?: string`.
- `calculateExamScore(questions, answers, durationSeconds, options?)`: Mendukung passing grade dinamis proporsional jika total soal != 110.

- [ ] **Step 1: Write the failing tests for dynamic test scoring and image schema**

```typescript
// tests/custom-test.test.ts
import { describe, it, expect } from 'vitest';
import { calculateExamScore } from '@/lib/scoring';
import { Question, ExamAnswer } from '@/lib/types';

describe('Custom Test & Image Schema', () => {
  it('supports image field on Question and Options', () => {
    const q: Question = {
      id: 1,
      category: 'TIU',
      subCategory: 'Figural',
      text: 'Pilihlah gambar yang merupakan kelanjutan pola berikut:',
      image: '/images/questions/figural-1.png',
      options: [
        { id: 'A', text: 'Gambar A', score: 5, image: '/images/questions/fig-opt-a.png' },
        { id: 'B', text: 'Gambar B', score: 0 },
      ],
      explanation: 'Pola berputar 90 derajat searah jarum jam.',
    };
    expect(q.image).toBe('/images/questions/figural-1.png');
    expect(q.options[0].image).toBe('/images/questions/fig-opt-a.png');
  });

  it('calculates proportional passing grade for 30 questions test (10 TWK, 10 TIU, 10 TKP)', () => {
    const mockQuestions: Question[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        category: 'TWK' as const,
        subCategory: 'Pancasila',
        text: `TWK ${i}`,
        options: [{ id: 'A', text: 'Opt', score: 5 }],
        explanation: 'Exp',
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: i + 11,
        category: 'TIU' as const,
        subCategory: 'Analogi',
        text: `TIU ${i}`,
        options: [{ id: 'A', text: 'Opt', score: 5 }],
        explanation: 'Exp',
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: i + 21,
        category: 'TKP' as const,
        subCategory: 'Pelayanan Publik',
        text: `TKP ${i}`,
        options: [{ id: 'A', text: 'Opt', score: 5 }],
        explanation: 'Exp',
      })),
    ];

    const answers: ExamAnswer[] = mockQuestions.map((q) => ({
      questionId: q.id,
      selectedOptionId: 'A',
    }));

    const result = calculateExamScore(mockQuestions, answers, 1800);
    expect(result.twk.totalQuestions).toBe(10);
    expect(result.tiu.totalQuestions).toBe(10);
    expect(result.tkp.totalQuestions).toBe(10);
    expect(result.twk.maxScore).toBe(50);
    expect(result.tiu.maxScore).toBe(50);
    expect(result.tkp.maxScore).toBe(50);
    expect(result.totalScore).toBe(150);
    expect(result.isPassedAll).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/custom-test.test.ts`
Expected: FAIL due to static MAX_SCORES / passing grade calculations.

- [ ] **Step 3: Update `src/lib/types.ts` & `src/lib/scoring.ts`**

Update `Question` interface with `image?: string` and update `scoring.ts` to compute `maxScore = category === 'TKP' ? totalQuestions * 5 : totalQuestions * 5` and `passingGrade = Math.round((DEFAULT_PG / DEFAULT_TOTAL) * totalQuestions)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/custom-test.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/scoring.ts tests/custom-test.test.ts
git commit -m "feat: support image fields in Question schema and proportional scoring for custom tests"
```

---

### Task 2: Figural Image Extractor & Scraper Engine

**Files:**
- Create: `scripts/extract_figural_images.py`
- Create: `scripts/scrape_visual_questions.py`
- Output Dir: `public/images/questions/`

**Interfaces:**
- Input: PDF E-Book CPNS (`C:/Users/cubeb/OneDrive/Documents/EBOOK CPNS/NEW - 12 SEPTEMBER 2024/TIU SKD CPNS.pdf` halaman 176–205).
- Output: File PNG bersih di `public/images/questions/` dengan resolusi minimum 100x100px.
- Metadata: `src/data/figural_bank.json` berisi katalog soal figural berpasangan gambar.

- [ ] **Step 1: Write `scripts/extract_figural_images.py`**

Mengekstrak gambar soal figural dari halaman 176–208 PDF TIU, memfilter gambar kecil (< 2KB / dimensi < 60px), dan mengelompokkan ke `public/images/questions/figural_*.png`.

- [ ] **Step 2: Run image extractor**

Run: `python scripts/extract_figural_images.py`
Expected: 20+ gambar figural tersimpan di `public/images/questions/`.

- [ ] **Step 3: Write visual question seed generator**

Membuat 10 butir soal TIU Figural (Serial, Ketidaksamaan, Analogi Gambar) yang mereferensikan file gambar lokal yang telah diekstrak, disimpan di `src/data/figural_seed.json`.

- [ ] **Step 4: Verify generated images exist and are readable**

Run: `ls -la public/images/questions/ | head -20`
Expected: List file gambar berekstensi `.png`.

- [ ] **Step 5: Commit**

```bash
git add scripts/extract_figural_images.py public/images/questions/ src/data/figural_seed.json
git commit -m "feat: extract figural images from ebook and create visual question seed"
```

---

### Task 3: Custom Test Generator API & Dynamic Package Loader

**Files:**
- Modify: `src/lib/loadPackage.ts`
- Create: `src/app/api/admin/generate-custom/route.ts`
- Create: `src/app/api/admin/packages/route.ts`
- Test: `tests/package-generator.test.ts`

**Interfaces:**
- `POST /api/admin/generate-custom`:
  - Body: `{ twkCount: number, tiuCount: number, tkpCount: number, packageId: string, title: string, includeImages: boolean }`
  - Returns: `{ success: true, packageId: string, totalQuestions: number }`
- `GET /api/admin/packages`: Mengembalikan list seluruh paket (resmi + kustom) beserta metadata jumlah soal dan status.
- `PUT /api/admin/packages`: Mengupdate isi butir soal paket tertentu.

- [ ] **Step 1: Write failing test for custom package generation logic**

Test sampling proporsional dan integrasi figural soal bergambar.

- [ ] **Step 2: Implement `src/app/api/admin/generate-custom/route.ts`**

Membaca paket referensi yang ada + bank figural, mengambil `twkCount`, `tiuCount`, `tkpCount`, dan menulis file `src/data/packages/[packageId].json`.

- [ ] **Step 3: Update `src/lib/loadPackage.ts`**

Mendukung pemuatan paket kustom secara fleksibel (baik dari file statis map maupun fallback dinamis).

- [ ] **Step 4: Run test to verify passes**

Run: `npx vitest run tests/package-generator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/loadPackage.ts src/app/api/admin/ tests/package-generator.test.ts
git commit -m "feat: add custom test generator API and flexible package loading"
```

---

### Task 4: Render Soal Bergambar di `QuestionCard.tsx`

**Files:**
- Modify: `src/components/QuestionCard.tsx`
- Modify: `src/components/MiniTryout.tsx`

**Interfaces:**
- `QuestionCard`: Jika `question.image` ada, render kontainer gambar dengan zoom modal preview dan loading skeleton.
- Pilihan jawaban ber-opsi gambar (`opt.image`): Tampilkan grid gambar opsi yang rapi.

- [ ] **Step 1: Write test for image rendering in QuestionCard**

Memastikan tag `img` ter-render jika `question.image` tersedia.

- [ ] **Step 2: Implement image rendering & responsive layout di `QuestionCard.tsx`**

Tambahkan preview gambar di bawah `question.text`, styling card image dengan border halus `0 0 0 1px var(--border)`, dan handling `opt.image`.

- [ ] **Step 3: Run Vitest**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/QuestionCard.tsx
git commit -m "feat: render question and option images in QuestionCard component"
```

---

### Task 5: Admin Panel Dashboard UI (`/admin`)

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/components/PackageEditor.tsx`
- Create: `src/app/admin/components/CustomTestCreator.tsx`
- Create: `src/app/admin/components/ImageScraperModal.tsx`

**Features:**
1. **PIN Security Gate**: Masukkan Admin PIN (default via env atau master pin) sebelum membuka dashboard.
2. **Tab 1: Manajemen Paket & Butir Soal**:
   - Pilih paket (Tryout 1 - 6 atau Custom).
   - Daftar 110 butir soal (searchable per nomor/kategori).
   - Inline Editor: Ubah teks pertanyaan, pilihan jawaban, bobot/kunci, pembahasan, dan lampirkan URL gambar.
3. **Tab 2: Buat Contoh Uji Coba (Custom Test Maker)**:
   - Form pembuatan test simulasi singkat: Atur jumlah soal TWK (default 10), TIU (default 10), TKP (default 10).
   - Checkbox "Sertakan Soal Figural Bergambar (TIU)".
   - Tombol "Generate & Publikasikan Test".
   - Setelah digenerate, langsung ada link "Buka Simulasi: /simulasi/tryout-mini" yang bisa langsung dicoba oleh siapa saja.
4. **Tab 3: Media & Gambar Referensi**:
   - Preview koleksi gambar figural yang siap dipasang ke soal.
   - Tombol scrape/fetch gambar dari URL web atau upload lokal.

- [ ] **Step 1: Implement PIN security gate in `/admin`**
- [ ] **Step 2: Implement `CustomTestCreator.tsx`**
- [ ] **Step 3: Implement `PackageEditor.tsx`**
- [ ] **Step 4: Wire navigation & notifications**
- [ ] **Step 5: Run tests & verify compilation**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/
git commit -m "feat: create full admin panel with package editor and custom test builder"
```

---

### Task 6: Seed Contoh Test Singkat & E2E Verification

**Files:**
- Generate: `src/data/packages/tryout-mini.json` (10 TWK, 10 TIU termasuk figural bergambar, 10 TKP = 30 butir soal)
- Modify: `src/lib/loadPackage.ts` (daftarkan `tryout-mini` di list katalog)
- Modify: `src/app/simulasi/page.tsx` (tampilkan kartu "Tryout Mini 30 Soal — Uji Coba Cepat")

- [ ] **Step 1: Generate `tryout-mini.json` via API / script**
- [ ] **Step 2: Add `tryout-mini` to `TRYOUT_LIST`**
- [ ] **Step 3: Run Vitest & Next.js production build**
- [ ] **Step 4: Commit & push to master**

```bash
git add -A
git commit -m "feat: provide tryout-mini 30 questions with figural images and deploy to production"
git push origin master
```
