# Implementation Plan: Section Indicator & Quick Filter on Question Navigation Grid

**Saved Path:** `.hermes/plans/2026-10-05_091500-keterangan-section-nomor-soal.md`

## 1. Goal
Menambahkan keterangan section (TWK, TIU, TKP beserta rentang nomornya, misal: TWK 1-30, TIU 31-65, TKP 66-110) pada panel navigasi nomor soal (`QuestionNavigationGrid`), dilengkapi tombol filter/lompat cepat ke awal section untuk memudahkan peserta memilih urutan pengerjaan soal.

---

## 2. Current Context / Assumptions
- Komponen navigasi nomor soal saat ini berada di `src/components/QuestionNavigationGrid.tsx`.
- Saat ini grid hanya menampilkan header teks statis: `Nomor Soal (1 - 110)` dan legenda status (Sudah, Ragu, Belum) tanpa membedakan kategori TWK, TIU, atau TKP.
- Soal dalam `questions: Question[]` memiliki properti `q.category` bertipe `QuestionCategory` (`'TWK' | 'TIU' | 'TKP'`).
- Di paket standar BKN (110 soal):
  - TWK: No 1 - 30 (30 butir)
  - TIU: No 31 - 65 (35 butir)
  - TKP: No 66 - 110 (45 butir)
- Di paket lain (misal Tryout Mini 30 soal): TWK 1-10, TIU 11-20, TKP 21-30.
- Algoritma pengelompokan harus **dinamis** berdasarkan array `questions` yang aktif, bukan di-hardcode 1-30 / 31-65 / 66-110, sehingga tetap akurat untuk semua paket soal.
- **PENTING (Aturan Pengacakan / Randomization)**: Jika paket mengaktifkan opsi acak soal (`randomize_questions`), **pengacakan soal hanya dilakukan di dalam internal masing-masing section** (soal TWK diacak sesama TWK, TIU sesama TIU, TKP sesama TKP). Urutan blok section **TETAP KONSISTEN**: TWK selalu nomor 1..N, TIU nomor N+1..M, TKP nomor M+1..Total. Pengacakan opsi jawaban (`randomize_options`) juga tetap berjalan normal di setiap butir soal tanpa mempengaruhi section.

---

## 3. Architecture / Proposed Approach
1. **Section-Preserving Question Randomizer (`shuffleWithinSections`)**:
   - Jika `meta?.randomize_questions` aktif, pisahkan array soal per kategori (TWK, TIU, TKP), acak (Fisher-Yates / shuffle) masing-masing kelompok secara independen, lalu gabungkan kembali dengan urutan section yang tetap utuh (TWK → TIU → TKP).
   - Hal ini menjamin section TWK, TIU, TKP tidak pernah bercampur aduk, namun urutan nomor soal di dalam section tersebut tetap teracak segar.
2. **Dynamic Section Range Calculation (`getQuestionSections`)**:
   - Fungsi helper murni (dapat diuji dengan unit test Vitest) yang menerima `questions: Question[]` dan menghasilkan list metadata section:
     ```ts
     export interface QuestionSection {
       category: QuestionCategory;
       startIndex: number; // 0-based
       endIndex: number;   // 0-based
       startNumber: number; // 1-based
       endNumber: number;   // 1-based
       totalCount: number;
       answeredCount: number;
     }
     ```
3. **Interactive Section Quick-Jump Bar (`QuestionNavigationGrid`)**:
   - Tampilkan bar tombol section kategori (TWK, TIU, TKP) tepat di atas grid atau sebagai header tab cepat.
   - Setiap chip/badge section menampilkan:
     - Label kategori: `TWK (1-30)`, `TIU (31-65)`, `TKP (66-110)` (atau rentang dinamis sesuai paket).
     - Indikator progres: `X/Y` terjawab.
     - Klik pada chip section otomatis melompat ke nomor awal section tersebut (`onSelectIndex(section.startIndex)`).
     - Highlight aktif jika `currentIndex` saat ini berada di dalam rentang section tersebut.
4. **Section Grouping / Header Dividers in Grid**:
   - Opsi tampilan grid dengan pemisah section (section header / divider) atau tab switcher kategori agar user dapat:
     - Melihat langsung batas pemisah antar kategori di dalam grid scrollable.
     - Atau memilih mode filter "Semua", "TWK", "TIU", "TKP" untuk fokus pada satu sub-tes tertentu.
5. **Header Question Card**:
   - Di `QuestionCard.tsx`, nomor soal juga diperkaya info section, misal: `Soal 31 (TIU #1)` atau label kategori yang jelas.

---

## 4. Step-by-Step Tasks

### Task 0: Fix `randomize_questions` — Shuffle Within Sections, Not Globally
- **Problem**: Saat ini di `src/app/simulasi/[id]/page.tsx` line 76-78, jika `meta?.randomize_questions` aktif, seluruh array soal di-shuffle mentah tanpa memperhatikan section:
  ```ts
  // ❌ SEKARANG (line 76-78): shuffle global, TWK/TIU/TKP bisa bercampur
  if (meta?.randomize_questions) {
    loaded = [...loaded].sort(() => 0.5 - Math.random());
  }
  ```
- **Fix**: Ganti dengan fungsi `shuffleWithinSections` yang mempertahankan urutan section.
- **File target**:
  - `src/lib/questionSections.ts` — tambah helper `shuffleWithinSections`
  - `tests/question-sections.test.ts` — unit test untuk fungsi shuffle
  - `src/app/simulasi/[id]/page.tsx` — ganti panggilan shuffle di line 76-78
- **Helper Implementation (ditambahkan ke `src/lib/questionSections.ts`)**:
  ```ts
  /** Fisher-Yates shuffle in place */
  function fisherYatesShuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Shuffle soal HANYA di dalam masing-masing section (TWK, TIU, TKP).
   * Urutan blok section tetap: TWK → TIU → TKP (sesuai urutan kemunculan awal).
   */
  export function shuffleWithinSections(questions: Question[]): Question[] {
    if (!questions || questions.length === 0) return [];

    // Kelompokkan soal per kategori, pertahankan urutan kemunculan pertama
    const groups = new Map<string, Question[]>();
    const categoryOrder: string[] = [];

    for (const q of questions) {
      const cat = q.category || 'TWK';
      if (!groups.has(cat)) {
        categoryOrder.push(cat);
        groups.set(cat, []);
      }
      groups.get(cat)!.push(q);
    }

    // Shuffle setiap kelompok secara independen, lalu gabungkan kembali
    const result: Question[] = [];
    for (const cat of categoryOrder) {
      result.push(...fisherYatesShuffle([...groups.get(cat)!]));
    }
    return result;
  }
  ```
- **TDD Test Code (ditambahkan ke `tests/question-sections.test.ts`)**:
  ```ts
  import { shuffleWithinSections } from '@/lib/questionSections';

  describe('shuffleWithinSections', () => {
    it('preserves section order TWK→TIU→TKP even after shuffling', () => {
      const mockQuestions = [
        ...Array.from({ length: 30 }, (_, i) => ({ id: i + 1, category: 'TWK' as const })),
        ...Array.from({ length: 35 }, (_, i) => ({ id: i + 31, category: 'TIU' as const })),
        ...Array.from({ length: 45 }, (_, i) => ({ id: i + 66, category: 'TKP' as const })),
      ] as Question[];

      const shuffled = shuffleWithinSections(mockQuestions);

      // Section boundaries must be preserved
      expect(shuffled.length).toBe(110);
      expect(shuffled.slice(0, 30).every(q => q.category === 'TWK')).toBe(true);
      expect(shuffled.slice(30, 65).every(q => q.category === 'TIU')).toBe(true);
      expect(shuffled.slice(65, 110).every(q => q.category === 'TKP')).toBe(true);

      // Same IDs preserved (no lost/duplicated questions)
      const originalIds = mockQuestions.map(q => q.id).sort((a, b) => a - b);
      const shuffledIds = shuffled.map(q => q.id).sort((a, b) => a - b);
      expect(shuffledIds).toEqual(originalIds);
    });

    it('returns empty array for empty input', () => {
      expect(shuffleWithinSections([])).toEqual([]);
    });
  });
  ```
- **Patch `src/app/simulasi/[id]/page.tsx`**:
  - Tambah import: `import { shuffleWithinSections } from '@/lib/questionSections';`
  - Ganti line 76-78 dari:
    ```ts
    if (meta?.randomize_questions) {
      loaded = [...loaded].sort(() => 0.5 - Math.random());
    }
    ```
    Menjadi:
    ```ts
    if (meta?.randomize_questions) {
      loaded = shuffleWithinSections(loaded);
    }
    ```
- **Command Verifikasi**: `npm test -- tests/question-sections.test.ts`
- **Expected Output**: Semua test pass, section order tetap TWK → TIU → TKP setelah shuffle.

---

### Task 1: Unit Test & Helper `getQuestionSections`
- **File target**:
  - `src/lib/questionSections.ts`
  - `tests/question-sections.test.ts`
- **Tujuan**: Menghitung rentang nomor (start-end) dan status terjawab untuk setiap kategori soal secara dinamis.
- **TDD Test Code (`tests/question-sections.test.ts`)**:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { getQuestionSections } from '@/lib/questionSections';
  import { Question, ExamAnswer } from '@/lib/types';

  describe('getQuestionSections', () => {
    it('calculates dynamic ranges for standard 110 CPNS questions', () => {
      const mockQuestions: Partial<Question>[] = [
        ...Array.from({ length: 30 }, (_, i) => ({ id: i + 1, category: 'TWK' as const })),
        ...Array.from({ length: 35 }, (_, i) => ({ id: i + 31, category: 'TIU' as const })),
        ...Array.from({ length: 45 }, (_, i) => ({ id: i + 66, category: 'TKP' as const })),
      ];

      const mockAnswers = new Map<number, ExamAnswer>([
        [1, { questionId: 1, selectedOptionId: 'A' }],
        [2, { questionId: 2, selectedOptionId: 'B' }],
        [31, { questionId: 31, selectedOptionId: 'C' }],
      ]);

      const sections = getQuestionSections(mockQuestions as Question[], mockAnswers);

      expect(sections).toHaveLength(3);
      expect(sections[0]).toEqual({
        category: 'TWK',
        startIndex: 0,
        endIndex: 29,
        startNumber: 1,
        endNumber: 30,
        totalCount: 30,
        answeredCount: 2,
      });
      expect(sections[1]).toEqual({
        category: 'TIU',
        startIndex: 30,
        endIndex: 64,
        startNumber: 31,
        endNumber: 65,
        totalCount: 35,
        answeredCount: 1,
      });
      expect(sections[2]).toEqual({
        category: 'TKP',
        startIndex: 65,
        endIndex: 109,
        startNumber: 66,
        endNumber: 110,
        totalCount: 45,
        answeredCount: 0,
      });
    });

    it('handles empty questions gracefully', () => {
      const sections = getQuestionSections([], new Map());
      expect(sections).toEqual([]);
    });
  });
  ```
- **Helper Implementation (`src/lib/questionSections.ts`)**:
  ```ts
  import { ExamAnswer, Question, QuestionCategory } from '@/lib/types';

  export interface QuestionSection {
    category: QuestionCategory;
    startIndex: number;
    endIndex: number;
    startNumber: number;
    endNumber: number;
    totalCount: number;
    answeredCount: number;
  }

  export function getQuestionSections(
    questions: Question[],
    answers: Map<number, ExamAnswer>
  ): QuestionSection[] {
    if (!questions || questions.length === 0) return [];

    const sectionsMap = new Map<QuestionCategory, {
      category: QuestionCategory;
      startIndex: number;
      endIndex: number;
      totalCount: number;
      answeredCount: number;
    }>();

    const categoryOrder: QuestionCategory[] = [];

    questions.forEach((q, idx) => {
      const cat = q.category || 'TWK';
      const ans = answers.get(q.id);
      const isAnswered = ans && ans.selectedOptionId != null && ans.selectedOptionId !== '';

      if (!sectionsMap.has(cat)) {
        categoryOrder.push(cat);
        sectionsMap.set(cat, {
          category: cat,
          startIndex: idx,
          endIndex: idx,
          totalCount: 1,
          answeredCount: isAnswered ? 1 : 0,
        });
      } else {
        const item = sectionsMap.get(cat)!;
        item.endIndex = idx;
        item.totalCount += 1;
        if (isAnswered) item.answeredCount += 1;
      }
    });

    return categoryOrder.map((cat) => {
      const s = sectionsMap.get(cat)!;
      return {
        category: s.category,
        startIndex: s.startIndex,
        endIndex: s.endIndex,
        startNumber: s.startIndex + 1,
        endNumber: s.endIndex + 1,
        totalCount: s.totalCount,
        answeredCount: s.answeredCount,
      };
    });
  }
  ```
- **Command Verifikasi**: `npm test -- tests/question-sections.test.ts`
- **Expected Output**: `2 passed`.

---

### Task 2: Redesign `QuestionNavigationGrid.tsx` with Section Chips & Headers
- **File target**: `src/components/QuestionNavigationGrid.tsx`
- **Perubahan UI**:
  1. Tambahkan bar navigasi section di bagian atas grid:
     - 3 tombol kategori: `TWK 1-30`, `TIU 31-65`, `TKP 66-110`.
     - Badge warna khas:
       - TWK: biru/indigo badge (`bg-sky-50 text-sky-700 border-sky-200`)
       - TIU: amber/orange badge (`bg-amber-50 text-amber-700 border-amber-200`)
       - TKP: emerald/teal badge (`bg-emerald-50 text-emerald-700 border-emerald-200`)
     - Klik pada tombol section akan melompat langsung ke soal pertama section tersebut (`onSelectIndex(section.startIndex)`).
     - Active indicator: border tebal / highlight jika nomor yang sedang dikerjakan berada di section tersebut.
  2. Tambahkan pemisah visual (Section Divider Header) di dalam grid nomor:
     - Di atas nomor 1: `TWK (Tes Wawasan Kebangsaan)`
     - Di atas nomor 31: `TIU (Tes Inteligensia Umum)`
     - Di atas nomor 66: `TKP (Tes Karakteristik Pribadi)`
  3. Tambahkan tab filter cepat (Opsional / Toggle):
     - `Semua (110)` | `TWK (30)` | `TIU (35)` | `TKP (45)` agar user yang ingin fokus menyelesaikan 1 sub-tes dapat memfilter grid tanpa terdistraksi nomor lain.
- **Command Verifikasi**: `npm test -- --run` dan `npx next build`.

---

### Task 3: Enhance QuestionCard & Simulasi Header
- **File target**: `src/components/QuestionCard.tsx`
- **Perubahan**:
  - Tampilkan label posisi nomor dalam section di samping `Soal {questionNumber}`, misal:
    `Soal 35 · TIU (Nomor 5 dari 35)` sehingga user selalu tahu konteks posisi sub-tesnya.
- **Command Verifikasi**: `npm test -- --run`.

---

### Task 4: Full Suite Testing, Build, & Git Commit
- **Commands**:
  1. `npm test -- --run` (harus pass semua 240+ test).
  2. `npx next build` (static type-checking & bundle sanity).
  3. `git add . && git commit -m "feat(exam): add dynamic section indicators and quick jump navigation for TWK, TIU, TKP"`.
  4. `git push origin master`.

---

## 5. Risks & Tradeoffs
- **Resiko Urutan Soal Acak (Randomized Packages)**: Jika paket mengaktifkan `randomize_questions`, soal TWK/TIU/TKP mungkin tidak terurut 1-30, 31-65, 66-110.
  - **Mitigasi**: Helper `getQuestionSections` mendeteksi rentang secara aman dan menyediakan filter per kategori (Tab TWK, TIU, TKP) sehingga walaupun posisi teracak, user tetap bisa menyaring nomor berdasarkan kategorinya dengan presisi.
- **Kerapian Layar Mobile**: Sidebar navigasi di mobile disembunyikan atau di dalam drawer. Tombol jump bar ringkas dengan text `TWK`, `TIU`, `TKP` menjaga konsistensi tanpa memakan banyak ruang vertikal.
